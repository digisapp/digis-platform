import { db } from '@/lib/data/system';
import { shows, showTickets, showReminders, users, streams } from '@/lib/data/system';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { WalletService } from '@/lib/wallet/wallet-service';
import { PushNotificationService } from '@/lib/services/push-notification-service';
import { sendEmail } from '@/lib/email/resend';

/**
 * ShowService handles ticketed show management and purchases using Drizzle ORM.
 *
 * IMPORTANT: This service uses complex queries and financial transactions.
 * All routes using this service MUST export:
 *   export const runtime = 'nodejs';
 *   export const dynamic = 'force-dynamic';
 */

export type ShowType = 'hangout' | 'fitness' | 'grwm' | 'try_on_haul' | 'qna' | 'classes' | 'tutorial' | 'music' | 'virtual_date' | 'gaming' | 'other';
export type ShowStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

interface CreateShowParams {
  creatorId: string;
  title: string;
  description?: string;
  showType: ShowType;
  ticketPrice: number;
  maxTickets?: number;
  scheduledStart: Date;
  scheduledEnd?: Date;
  durationMinutes?: number;
  coverImageUrl?: string;
  trailerUrl?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  tags?: string[];
}

interface PurchaseTicketParams {
  userId: string;
  showId: string;
}

interface GetUpcomingShowsParams {
  limit?: number;
  offset?: number;
  creatorId?: string;
  showType?: ShowType;
  upcoming?: boolean;
}

export class ShowService {
  /**
   * Create a new ticketed show
   */
  static async createShow(params: CreateShowParams) {
    const {
      creatorId,
      title,
      description,
      showType,
      ticketPrice,
      maxTickets,
      scheduledStart,
      scheduledEnd,
      durationMinutes = 60,
      coverImageUrl,
      trailerUrl,
      isPrivate = false,
      requiresApproval = false,
      tags,
    } = params;

    // Auto-cancel any expired shows from this creator first
    await this.cancelExpiredShows();

    // Check if creator already has an active (scheduled or live) show
    const existingShow = await db.query.shows.findFirst({
      where: and(
        eq(shows.creatorId, creatorId),
        sql`${shows.status} IN ('scheduled', 'live')`
      ),
    });

    if (existingShow) {
      throw new Error('You already have an active stream scheduled. Please cancel it first or wait for it to complete.');
    }

    // Validate ticket price
    if (ticketPrice < 0) {
      throw new Error('Ticket price cannot be negative');
    }

    // Allow streams to start now or in the future (with 5 min buffer for clock differences)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (scheduledStart < fiveMinutesAgo) {
      throw new Error('Stream start time cannot be more than 5 minutes in the past');
    }

    // Generate unique room name for LiveKit
    const roomName = `show_${uuidv4().slice(0, 8)}_${Date.now()}`;

    const [show] = await db
      .insert(shows)
      .values({
        creatorId,
        title,
        description,
        showType,
        ticketPrice,
        maxTickets,
        ticketsSold: 0,
        scheduledStart,
        scheduledEnd,
        durationMinutes,
        roomName,
        coverImageUrl,
        trailerUrl,
        isPrivate,
        requiresApproval,
        tags,
        status: 'scheduled',
        totalRevenue: 0,
      })
      .returning();

    return show;
  }

  /**
   * Purchase a ticket for a show
   * This implements the full purchase flow with wallet integration
   */
  static async purchaseTicket(params: PurchaseTicketParams) {
    const { userId, showId } = params;

    return await db.transaction(async (tx) => {
      // Get show details
      const show = await tx.query.shows.findFirst({
        where: eq(shows.id, showId),
      });

      if (!show) {
        throw new Error('Stream not found');
      }

      // Check if show is still available
      if (show.status === 'cancelled') {
        throw new Error('This stream has been cancelled');
      }

      if (show.status === 'ended') {
        throw new Error('This stream has already ended');
      }

      // Check if sold out
      if (show.maxTickets && show.ticketsSold >= show.maxTickets) {
        throw new Error('Stream is sold out');
      }

      // Check if user already has a ticket
      const existingTicket = await tx.query.showTickets.findFirst({
        where: and(
          eq(showTickets.showId, showId),
          eq(showTickets.userId, userId)
        ),
      });

      if (existingTicket) {
        throw new Error('You already have a ticket for this stream');
      }

      // Check user has sufficient balance
      const availableBalance = await WalletService.getAvailableBalance(userId);
      if (availableBalance < show.ticketPrice) {
        throw new Error('Insufficient balance to purchase ticket');
      }

      // Creators earn 100% of ticket sales
      // Platform makes money from coin purchase markup
      const creatorEarnings = show.ticketPrice;

      // Create idempotency key for transactions
      const purchaseId = uuidv4();

      // Deduct coins from buyer
      const buyerTransaction = await WalletService.createTransaction({
        userId,
        amount: -show.ticketPrice,
        type: 'purchase',
        description: `Ticket for "${show.title}"`,
        metadata: {
          showId,
          purchaseId,
          ticketPrice: show.ticketPrice,
        },
        idempotencyKey: `ticket_purchase_${purchaseId}`,
      });

      // Credit full amount to creator (100%)
      await WalletService.createTransaction({
        userId: show.creatorId,
        amount: creatorEarnings,
        type: 'creator_payout',
        description: `Ticket sale for "${show.title}"`,
        metadata: {
          showId,
          purchaseId,
          ticketsSold: show.ticketsSold + 1,
        },
        idempotencyKey: `ticket_creator_payout_${purchaseId}`,
      });

      // Calculate next ticket number
      const ticketNumber = show.ticketsSold + 1;

      // Create the ticket
      const [ticket] = await tx
        .insert(showTickets)
        .values({
          showId,
          userId,
          ticketNumber,
          coinsPaid: show.ticketPrice,
          transactionId: buyerTransaction.id,
          isValid: true,
        })
        .returning();

      // Update show stats
      await tx
        .update(shows)
        .set({
          ticketsSold: sql`${shows.ticketsSold} + 1`,
          totalRevenue: sql`${shows.totalRevenue} + ${show.ticketPrice}`,
          updatedAt: new Date(),
        })
        .where(eq(shows.id, showId));

      return { ticket, show };
    });
  }

  /**
   * Check if user has a valid ticket for a show
   */
  static async hasTicket(userId: string, showId: string): Promise<boolean> {
    const ticket = await db.query.showTickets.findFirst({
      where: and(
        eq(showTickets.showId, showId),
        eq(showTickets.userId, userId),
        eq(showTickets.isValid, true)
      ),
    });

    return !!ticket;
  }

  /**
   * Verify user can access a live show
   * Returns access token if valid
   * Creators can always access their own shows without a ticket
   */
  static async verifyAccess(userId: string, showId: string) {
    // Get show details
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });

    if (!show) {
      throw new Error('Stream not found');
    }

    // Check if show is live or scheduled (creator can access scheduled shows to start them)
    const isCreator = show.creatorId === userId;

    if (!isCreator) {
      // Non-creators need a valid ticket
      const hasValidTicket = await this.hasTicket(userId, showId);
      if (!hasValidTicket) {
        throw new Error('No valid ticket for this stream');
      }

      // Non-creators can only join live shows
      if (show.status !== 'live') {
        throw new Error('Stream is not currently live');
      }

      // Check-in the attendee
      await this.checkInAttendee(userId, showId);
    }

    // Return room name for LiveKit connection
    return {
      roomName: show.roomName,
      showTitle: show.title,
      status: show.status,
      isCreator,
    };
  }

  /**
   * Get upcoming shows (for browse/discovery)
   * Automatically cancels any expired shows before returning results
   */
  static async getUpcomingShows(params: GetUpcomingShowsParams = {}) {
    // Auto-cancel any expired shows first (don't await - run in background)
    this.cancelExpiredShows().catch(err => {
      console.error('[ShowService] Error auto-cancelling expired shows:', err);
    });

    const {
      limit = 20,
      offset = 0,
      creatorId,
      showType,
      upcoming = true
    } = params;

    const conditions = [];

    // Filter by status - either scheduled only, or live + scheduled
    // Also filter out scheduled shows that are more than 4 hours past their start time
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    if (upcoming) {
      conditions.push(eq(shows.status, 'scheduled'));
      conditions.push(gte(shows.scheduledStart, new Date()));
    } else {
      // Get both live and scheduled shows (not ended or cancelled)
      // But exclude scheduled shows that are more than 4 hours past their start time
      conditions.push(sql`(${shows.status} = 'live' OR (${shows.status} = 'scheduled' AND ${shows.scheduledStart} > ${fourHoursAgo}))`);
    }

    if (creatorId) {
      conditions.push(eq(shows.creatorId, creatorId));
    }

    if (showType) {
      conditions.push(eq(shows.showType, showType));
    }

    const showsList = await db
      .select({
        id: shows.id,
        title: shows.title,
        description: shows.description,
        showType: shows.showType,
        ticketPrice: shows.ticketPrice,
        maxTickets: shows.maxTickets,
        ticketsSold: shows.ticketsSold,
        scheduledStart: shows.scheduledStart,
        scheduledEnd: shows.scheduledEnd,
        durationMinutes: shows.durationMinutes,
        coverImageUrl: shows.coverImageUrl,
        trailerUrl: shows.trailerUrl,
        status: shows.status,
        tags: shows.tags,
        createdAt: shows.createdAt,
        totalRevenue: shows.totalRevenue,
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(shows)
      .innerJoin(users, eq(shows.creatorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(shows.status), shows.scheduledStart) // live first, then by date
      .limit(limit)
      .offset(offset);

    return showsList;
  }

  /**
   * Get user's purchased tickets
   */
  static async getUserTickets(userId: string) {
    const tickets = await db
      .select({
        id: showTickets.id,
        ticketNumber: showTickets.ticketNumber,
        coinsPaid: showTickets.coinsPaid,
        isValid: showTickets.isValid,
        checkInTime: showTickets.checkInTime,
        purchasedAt: showTickets.purchasedAt,
        show: {
          id: shows.id,
          title: shows.title,
          description: shows.description,
          showType: shows.showType,
          scheduledStart: shows.scheduledStart,
          durationMinutes: shows.durationMinutes,
          coverImageUrl: shows.coverImageUrl,
          status: shows.status,
          roomName: shows.roomName,
        },
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(showTickets)
      .innerJoin(shows, eq(showTickets.showId, shows.id))
      .innerJoin(users, eq(shows.creatorId, users.id))
      .where(eq(showTickets.userId, userId))
      .orderBy(desc(shows.scheduledStart));

    return tickets;
  }

  /**
   * Get creator's shows
   */
  static async getCreatorShows(creatorId: string) {
    const creatorShows = await db.query.shows.findMany({
      where: eq(shows.creatorId, creatorId),
      orderBy: [desc(shows.scheduledStart)],
    });

    return creatorShows;
  }

  /**
   * Start a show (go live) or resume if already live
   * This creates the LiveKit room and updates status
   * Idempotent: Can be called multiple times safely (for reconnection)
   */
  static async startShow(showId: string, creatorId: string) {
    return await db.transaction(async (tx) => {
      const show = await tx.query.shows.findFirst({
        where: eq(shows.id, showId),
      });

      if (!show) {
        throw new Error('Stream not found');
      }

      if (show.creatorId !== creatorId) {
        throw new Error('Unauthorized: Not the stream creator');
      }

      // Allow resuming a live show (for reconnection after disconnect)
      if (show.status === 'live') {
        console.log(`[ShowService] Creator resuming live show ${showId}`);
        return { roomName: show.roomName, resumed: true };
      }

      if (show.status !== 'scheduled') {
        throw new Error('Stream is not in scheduled state');
      }

      // Update show status to live
      await tx
        .update(shows)
        .set({
          status: 'live',
          actualStart: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shows.id, showId));

      // Get creator info for notification
      const creator = await tx.query.users.findFirst({
        where: eq(users.id, creatorId),
      });

      // Get all ticket holders for this show
      const tickets = await tx.query.showTickets.findMany({
        where: and(
          eq(showTickets.showId, showId),
          eq(showTickets.isValid, true)
        ),
        with: {
          user: true,
        },
      });

      // Send notifications to ticket holders (don't await - run in background)
      const notifyTicketHolders = async () => {
        for (const ticket of tickets) {
          if (!ticket.user) continue;

          // Send push notification
          await PushNotificationService.sendNotification(
            ticket.userId,
            'stream',
            {
              title: '🎬 Show Starting Now!',
              body: `${creator?.displayName || 'Creator'}'s show "${show.title}" is starting now!`,
              icon: creator?.avatarUrl || '/icons/icon-192x192.png',
              data: {
                url: `/streams/${showId}`,
                type: 'stream',
                showId,
              },
            }
          );

          // Send email notification
          if (ticket.user.email) {
            await sendEmail({
              to: ticket.user.email,
              subject: `🎬 ${creator?.displayName || 'Creator'}'s show is starting now!`,
              text: `
Hi ${ticket.user.displayName || 'there'},

The show you have a ticket for is starting NOW!

Show: ${show.title}
Creator: ${creator?.displayName || 'Creator'}

Click here to join: ${process.env.NEXT_PUBLIC_URL}/streams/${showId}

Don't miss it!

Best,
The Digis Team
              `.trim(),
            });
          }
        }
      };

      // Run notifications in background (don't block the response)
      notifyTicketHolders().catch(err => {
        console.error('[ShowService] Error notifying ticket holders:', err);
      });

      return { roomName: show.roomName };
    });
  }

  /**
   * End a show
   */
  static async endShow(showId: string, creatorId: string) {
    return await db.transaction(async (tx) => {
      const show = await tx.query.shows.findFirst({
        where: eq(shows.id, showId),
      });

      if (!show) {
        throw new Error('Stream not found');
      }

      if (show.creatorId !== creatorId) {
        throw new Error('Unauthorized: Not the stream creator');
      }

      if (show.status !== 'live') {
        throw new Error('Stream is not currently live');
      }

      // Update show status to ended
      await tx
        .update(shows)
        .set({
          status: 'ended',
          actualEnd: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shows.id, showId));

      // Get final stats
      const attendeeCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(showTickets)
        .where(and(
          eq(showTickets.showId, showId),
          sql`${showTickets.checkInTime} IS NOT NULL`
        ));

      return {
        ticketsSold: show.ticketsSold,
        totalRevenue: show.totalRevenue,
        attendees: attendeeCount[0]?.count || 0,
      };
    });
  }

  /**
   * Check in an attendee when they join the live show
   */
  static async checkInAttendee(userId: string, showId: string) {
    const ticket = await db.query.showTickets.findFirst({
      where: and(
        eq(showTickets.showId, showId),
        eq(showTickets.userId, userId)
      ),
    });

    if (!ticket) {
      throw new Error('No ticket found');
    }

    // Only check in if not already checked in
    if (!ticket.checkInTime) {
      await db
        .update(showTickets)
        .set({ checkInTime: new Date() })
        .where(eq(showTickets.id, ticket.id));
    }

    return ticket;
  }

  /**
   * Get attendee list for a show (creator only)
   */
  static async getAttendees(showId: string, creatorId: string) {
    // Verify creator owns the show
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });

    if (!show) {
      throw new Error('Stream not found');
    }

    if (show.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    // Get all ticket holders
    const attendees = await db
      .select({
        id: showTickets.id,
        ticketNumber: showTickets.ticketNumber,
        purchasedAt: showTickets.purchasedAt,
        checkInTime: showTickets.checkInTime,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(showTickets)
      .innerJoin(users, eq(showTickets.userId, users.id))
      .where(eq(showTickets.showId, showId))
      .orderBy(showTickets.ticketNumber);

    return attendees;
  }

  /**
   * Get show statistics (creator only)
   */
  static async getShowStats(showId: string, creatorId: string) {
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });

    if (!show) {
      throw new Error('Stream not found');
    }

    if (show.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    // Get check-in count
    const [checkInCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(showTickets)
      .where(and(
        eq(showTickets.showId, showId),
        sql`${showTickets.checkInTime} IS NOT NULL`
      ));

    // Creators earn 100% of revenue
    const creatorEarnings = show.totalRevenue;

    return {
      ticketsSold: show.ticketsSold,
      maxTickets: show.maxTickets,
      totalRevenue: show.totalRevenue,
      creatorEarnings,
      attendees: show.ticketsSold,
      checkedIn: checkInCount?.count || 0,
      sellThroughRate: show.maxTickets
        ? Math.round((show.ticketsSold / show.maxTickets) * 100)
        : null,
    };
  }

  /**
   * Cancel a show with automatic refunds for all ticket holders
   */
  static async cancelShow(showId: string, creatorId: string) {
    return await db.transaction(async (tx) => {
      const show = await tx.query.shows.findFirst({
        where: eq(shows.id, showId),
      });

      if (!show) {
        throw new Error('Stream not found');
      }

      if (show.creatorId !== creatorId) {
        throw new Error('Unauthorized');
      }

      if (show.status !== 'scheduled') {
        throw new Error('Can only cancel scheduled streams');
      }

      // Get all valid tickets for refunds
      const tickets = await tx.query.showTickets.findMany({
        where: and(
          eq(showTickets.showId, showId),
          eq(showTickets.isValid, true)
        ),
      });

      // Refund each ticket holder and invalidate tickets
      let refundedCount = 0;
      for (const ticket of tickets) {
        try {
          // Refund buyer
          await WalletService.createTransaction({
            userId: ticket.userId,
            amount: ticket.coinsPaid,
            type: 'refund',
            description: `Refund: "${show.title}" was cancelled by creator`,
            metadata: { showId: show.id, ticketId: ticket.id, reason: 'creator_cancelled' },
            idempotencyKey: `refund_cancel_${ticket.id}`,
          });

          // Deduct from creator
          await WalletService.createTransaction({
            userId: creatorId,
            amount: -ticket.coinsPaid,
            type: 'refund',
            description: `Refund issued: "${show.title}" cancelled`,
            metadata: { showId: show.id, ticketId: ticket.id, reason: 'creator_cancelled' },
            idempotencyKey: `refund_cancel_creator_${ticket.id}`,
          });

          refundedCount++;
        } catch (err) {
          console.error(`[ShowService] Failed to refund ticket ${ticket.id}:`, err);
        }

        // Invalidate ticket regardless of refund success
        await tx
          .update(showTickets)
          .set({ isValid: false })
          .where(eq(showTickets.id, ticket.id));
      }

      // Update show status
      await tx
        .update(shows)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(shows.id, showId));

      console.log(`[ShowService] Show "${show.title}" cancelled, refunded ${refundedCount}/${tickets.length} tickets`);

      return { cancelledTickets: tickets.length, refundedTickets: refundedCount };
    });
  }

  /**
   * Set reminder for a show
   */
  static async setReminder(userId: string, showId: string, remindBeforeMinutes: number = 15) {
    // Check if reminder already exists
    const existing = await db.query.showReminders.findFirst({
      where: and(
        eq(showReminders.showId, showId),
        eq(showReminders.userId, userId)
      ),
    });

    if (existing) {
      // Update existing reminder
      await db
        .update(showReminders)
        .set({ remindBeforeMinutes })
        .where(eq(showReminders.id, existing.id));

      return existing;
    }

    // Create new reminder
    const [reminder] = await db
      .insert(showReminders)
      .values({
        showId,
        userId,
        remindBeforeMinutes,
      })
      .returning();

    return reminder;
  }

  /**
   * Auto-cancel expired shows that weren't started
   * Shows are considered expired if they're still 'scheduled' and more than 30 minutes past start time
   */
  static async cancelExpiredShows() {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find all expired shows
    const expiredShows = await db
      .select()
      .from(shows)
      .where(
        and(
          eq(shows.status, 'scheduled'),
          lte(shows.scheduledStart, thirtyMinutesAgo)
        )
      );

    if (expiredShows.length === 0) {
      return { cancelledCount: 0 };
    }

    console.log(`[ShowService] Auto-cancelling ${expiredShows.length} expired shows`);

    let cancelledCount = 0;

    for (const show of expiredShows) {
      try {
        await db.transaction(async (tx) => {
          // Get all tickets for refunds
          const tickets = await tx.query.showTickets.findMany({
            where: eq(showTickets.showId, show.id),
          });

          // Issue refunds
          for (const ticket of tickets) {
            await WalletService.createTransaction({
              userId: ticket.userId,
              amount: ticket.coinsPaid,
              type: 'refund',
              description: `Refund for expired stream "${show.title}"`,
              metadata: { showId: show.id, ticketId: ticket.id, reason: 'auto_expired' },
              idempotencyKey: `refund_expired_${ticket.id}`,
            });

            // Invalidate ticket
            await tx
              .update(showTickets)
              .set({ isValid: false })
              .where(eq(showTickets.id, ticket.id));
          }

          // Update show status
          await tx
            .update(shows)
            .set({
              status: 'cancelled',
              updatedAt: new Date(),
            })
            .where(eq(shows.id, show.id));

          console.log(`[ShowService] Auto-cancelled show "${show.title}" (${show.id}), refunded ${tickets.length} tickets`);
        });

        cancelledCount++;
      } catch (err) {
        console.error(`[ShowService] Failed to auto-cancel show ${show.id}:`, err);
      }
    }

    return { cancelledCount };
  }

  /**
   * Update show details
   */
  static async updateShow(showId: string, creatorId: string, updates: Partial<CreateShowParams>) {
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });

    if (!show) {
      throw new Error('Stream not found');
    }

    if (show.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    if (show.status !== 'scheduled') {
      throw new Error('Can only edit scheduled streams');
    }

    const [updated] = await db
      .update(shows)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shows.id, showId))
      .returning();

    return updated;
  }
}
