import { db } from '@/lib/data/system';
import {
  streams,
  streamMessages,
  streamGifts,
  streamViewers,
  streamFeaturedCreators,
  streamTickets,
  streamGoals,
  virtualGifts,
  users,
  wallets,
  walletTransactions,
  follows,
  subscriptions,
  shows,
  showTickets,
} from '@/lib/data/system';
import { eq, desc, and, sql, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { WalletService } from '../wallet/wallet-service';
import {
  getCachedViewerCount,
  setCachedViewerCount,
  incrementViewerCount as redisIncrementViewerCount,
  decrementViewerCount as redisDecrementViewerCount,
} from '@/lib/cache';
import { LiveKitEgressService } from '../services/livekit-egress-service';
import { BlockService } from '../services/block-service';

/**
 * StreamService uses Drizzle ORM for complex streaming operations.
 * All routes using this service MUST export:
 *   export const runtime = 'nodejs';
 *   export const dynamic = 'force-dynamic';
 */

export class StreamService {
  /**
   * Check if creator has an active (live) stream
   */
  static async getActiveStream(creatorId: string) {
    const activeStream = await db.query.streams.findFirst({
      where: and(
        eq(streams.creatorId, creatorId),
        eq(streams.status, 'live')
      ),
    });
    return activeStream;
  }

  /**
   * Create and start a new stream
   */
  static async createStream(
    creatorId: string,
    title: string,
    description?: string,
    privacy?: string,
    thumbnailUrl?: string,
    scheduledAt?: Date,
    orientation?: 'landscape' | 'portrait',
    featuredCreatorCommission?: number,
    ticketPrice?: number,
    goPrivateEnabled?: boolean,
    goPrivateRate?: number,
    goPrivateMinDuration?: number,
    category?: string,
    tags?: string[]
  ) {
    // Check if creator already has an active stream
    const existingStream = await this.getActiveStream(creatorId);
    if (existingStream) {
      // Return existing stream instead of creating a duplicate
      console.log(`[StreamService] Creator ${creatorId} already has active stream ${existingStream.id}`);
      return existingStream;
    }

    const roomName = `stream_${uuidv4()}`;
    const isScheduled = scheduledAt && scheduledAt > new Date();

    const [stream] = await db
      .insert(streams)
      .values({
        creatorId,
        title,
        description,
        privacy: privacy || 'public',
        thumbnailUrl,
        roomName,
        status: isScheduled ? 'scheduled' : 'live',
        scheduledFor: scheduledAt,
        startedAt: isScheduled ? undefined : new Date(),
        lastHeartbeat: isScheduled ? undefined : new Date(), // Set initial heartbeat
        orientation: orientation || 'landscape',
        featuredCreatorCommission: featuredCreatorCommission || 0,
        ticketPrice: ticketPrice || null,
        goPrivateEnabled: goPrivateEnabled ?? true,
        goPrivateRate: goPrivateRate || null,
        goPrivateMinDuration: goPrivateMinDuration || null,
        category: category || null,
        tags: tags || [],
      })
      .returning();

    // Start recording if stream is going live immediately
    if (!isScheduled) {
      try {
        const egressId = await LiveKitEgressService.startRecording(roomName, stream.id);
        // Update stream with egress ID
        await db
          .update(streams)
          .set({ egressId })
          .where(eq(streams.id, stream.id));
        console.log(`[StreamService] Started recording for stream ${stream.id}, egress: ${egressId}`);
      } catch (err) {
        // Recording is optional - don't fail stream creation if egress fails
        console.warn('[StreamService] Failed to start recording (continuing without):', err);
      }
    }

    return stream;
  }

  /**
   * End a stream and save stats (idempotent - safe to call multiple times)
   */
  static async endStream(streamId: string) {
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      throw new Error('Stream not found');
    }

    // Idempotent: If already ended, just return the stream
    if (stream.status !== 'live') {
      return stream;
    }

    const endTime = new Date();
    const startTime = stream.startedAt || new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Stop recording if egress was active
    if (stream.egressId) {
      try {
        await LiveKitEgressService.stopRecording(stream.egressId);
        console.log(`[StreamService] Stopped recording for stream ${streamId}`);
      } catch (err) {
        console.warn('[StreamService] Failed to stop recording:', err);
      }
    }

    const [updatedStream] = await db
      .update(streams)
      .set({
        status: 'ended',
        endedAt: endTime,
        durationSeconds,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId))
      .returning();

    // Clear all viewers
    await db.delete(streamViewers).where(eq(streamViewers.streamId, streamId));

    // Cancel any scheduled shows linked to this stream (with refunds)
    await this.cancelScheduledShowsForStream(streamId);

    return updatedStream;
  }

  /**
   * Cancel any scheduled shows that were announced from this stream
   * Issues refunds to all ticket holders
   */
  private static async cancelScheduledShowsForStream(streamId: string) {
    try {
      // Find any scheduled shows linked to this stream
      const scheduledShows = await db.query.shows.findMany({
        where: and(
          eq(shows.streamId, streamId),
          eq(shows.status, 'scheduled')
        ),
      });

      for (const show of scheduledShows) {
        console.log(`[StreamService] Cancelling scheduled show ${show.id} linked to ended stream ${streamId}`);

        // Get all tickets for refunds
        const tickets = await db.query.showTickets.findMany({
          where: eq(showTickets.showId, show.id),
        });

        // Issue refunds
        for (const ticket of tickets) {
          try {
            await WalletService.createTransaction({
              userId: ticket.userId,
              amount: ticket.coinsPaid,
              type: 'refund',
              description: `Refund: "${show.title}" was cancelled (stream ended)`,
              metadata: { showId: show.id, ticketId: ticket.id, reason: 'stream_ended' },
              idempotencyKey: `refund_stream_end_${ticket.id}`,
            });

            // Invalidate ticket
            await db
              .update(showTickets)
              .set({ isValid: false })
              .where(eq(showTickets.id, ticket.id));
          } catch (refundError) {
            console.error(`[StreamService] Failed to refund ticket ${ticket.id}:`, refundError);
          }
        }

        // Mark show as cancelled
        await db
          .update(shows)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(shows.id, show.id));

        console.log(`[StreamService] Cancelled show ${show.id}, refunded ${tickets.length} tickets`);
      }
    } catch (error) {
      // Log but don't fail the stream end
      console.error('[StreamService] Error cancelling scheduled shows:', error);
    }
  }

  /**
   * Join a stream as a viewer
   */
  static async joinStream(streamId: string, userId: string, username: string) {
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      throw new Error('Stream not found');
    }

    if (stream.status !== 'live') {
      throw new Error('Stream is not live');
    }

    // Check if already viewing
    const existing = await db.query.streamViewers.findFirst({
      where: and(
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.userId, userId)
      ),
    });

    if (existing) {
      // Update last seen
      await db
        .update(streamViewers)
        .set({ lastSeenAt: new Date() })
        .where(eq(streamViewers.id, existing.id));

      return existing;
    }

    // Add new viewer
    const [viewer] = await db
      .insert(streamViewers)
      .values({
        streamId,
        userId,
        username,
      })
      .returning();

    // Update viewer counts
    await this.updateViewerCount(streamId);

    // Increment total views
    await db
      .update(streams)
      .set({
        totalViews: sql`${streams.totalViews} + 1`,
      })
      .where(eq(streams.id, streamId));

    return viewer;
  }

  /**
   * Leave a stream
   */
  static async leaveStream(streamId: string, userId: string) {
    await db.delete(streamViewers).where(
      and(
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.userId, userId)
      )
    );

    await this.updateViewerCount(streamId);
  }

  /**
   * Update viewer count (call after join/leave)
   * Cleans up stale viewers first, then counts active ones
   */
  static async updateViewerCount(streamId: string) {
    // First, clean up stale viewers (no activity for 2+ minutes)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await db.delete(streamViewers).where(
      and(
        eq(streamViewers.streamId, streamId),
        lt(streamViewers.lastSeenAt, twoMinutesAgo)
      )
    );

    // Count remaining active viewers
    const viewers = await db.query.streamViewers.findMany({
      where: eq(streamViewers.streamId, streamId),
    });

    const currentCount = viewers.length;

    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) return;

    const peakViewers = Math.max(stream.peakViewers, currentCount);

    // Update database
    await db
      .update(streams)
      .set({
        currentViewers: currentCount,
        peakViewers,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    // Also cache in Redis for fast reads
    await setCachedViewerCount(streamId, currentCount);

    return { currentViewers: currentCount, peakViewers };
  }

  /**
   * Update viewer's last seen timestamp (heartbeat)
   */
  static async updateViewerHeartbeat(streamId: string, userId: string) {
    await db
      .update(streamViewers)
      .set({ lastSeenAt: new Date() })
      .where(
        and(
          eq(streamViewers.streamId, streamId),
          eq(streamViewers.userId, userId)
        )
      );
  }

  /**
   * Get viewer count - uses Redis cache for performance
   */
  static async getViewerCount(streamId: string): Promise<number> {
    // Try cache first
    const cached = await getCachedViewerCount(streamId);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - get from database
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: { currentViewers: true },
    });

    const count = stream?.currentViewers ?? 0;
    await setCachedViewerCount(streamId, count);
    return count;
  }

  /**
   * Increment viewer count atomically via Redis (for real-time updates)
   */
  static async incrementViewerCountFast(streamId: string): Promise<number> {
    return await redisIncrementViewerCount(streamId);
  }

  /**
   * Decrement viewer count atomically via Redis (for real-time updates)
   */
  static async decrementViewerCountFast(streamId: string): Promise<number> {
    return await redisDecrementViewerCount(streamId);
  }

  /**
   * Send a chat message
   */
  static async sendMessage(
    streamId: string,
    userId: string,
    username: string,
    message: string
  ) {
    const [msg] = await db
      .insert(streamMessages)
      .values({
        streamId,
        userId,
        username,
        message,
        messageType: 'chat',
      })
      .returning();

    return msg;
  }

  /**
   * Send a virtual gift
   * @param recipientCreatorId - Optional: direct the gift to a featured creator instead of stream host
   * @param recipientUsername - Optional: username of the featured creator
   */
  static async sendGift(
    streamId: string,
    senderId: string,
    senderUsername: string,
    giftId: string,
    quantity: number = 1,
    recipientCreatorId?: string,
    recipientUsername?: string,
    idempotencyKey?: string
  ) {
    // Get gift details
    const gift = await db.query.virtualGifts.findFirst({
      where: eq(virtualGifts.id, giftId),
    });

    if (!gift) {
      throw new Error('Gift not found');
    }

    const totalCoins = gift.coinCost * quantity;

    // Generate deterministic idempotency key if not provided
    // Uses 1-second precision to allow retries but block rapid double-clicks
    const finalIdempotencyKey = idempotencyKey ||
      `gift_${senderId}_${streamId}_${giftId}_${quantity}_${Math.floor(Date.now() / 1000)}`;

    // Deduct coins from sender using wallet service
    await WalletService.createTransaction({
      userId: senderId,
      amount: -totalCoins,
      type: 'stream_tip',
      description: recipientCreatorId
        ? `Sent ${quantity}x ${gift.emoji} ${gift.name} to @${recipientUsername}`
        : `Sent ${quantity}x ${gift.emoji} ${gift.name} to stream`,
      idempotencyKey: finalIdempotencyKey,
    });

    // Record gift with optional recipient
    const [streamGift] = await db
      .insert(streamGifts)
      .values({
        streamId,
        senderId,
        giftId,
        quantity,
        totalCoins,
        senderUsername,
        recipientCreatorId: recipientCreatorId || null,
        recipientUsername: recipientUsername || null,
      })
      .returning();

    // Update stream total gifts
    await db
      .update(streams)
      .set({
        totalGiftsReceived: sql`${streams.totalGiftsReceived} + ${totalCoins}`,
      })
      .where(eq(streams.id, streamId));

    // Create gift system message
    const messageText = recipientCreatorId
      ? `sent ${quantity}x ${gift.emoji} ${gift.name} to @${recipientUsername}`
      : `sent ${quantity}x ${gift.emoji} ${gift.name}`;

    await db.insert(streamMessages).values({
      streamId,
      userId: senderId,
      username: senderUsername,
      message: messageText,
      messageType: 'gift',
      giftId,
      giftAmount: totalCoins,
    });

    // Determine who gets the coins
    let recipientId: string;

    if (recipientCreatorId) {
      // Direct gift to featured creator
      recipientId = recipientCreatorId;

      // Update featured creator's tip count
      await db
        .update(streamFeaturedCreators)
        .set({
          tipsReceived: sql`${streamFeaturedCreators.tipsReceived} + ${totalCoins}`,
          giftCount: sql`${streamFeaturedCreators.giftCount} + ${quantity}`,
        })
        .where(
          and(
            eq(streamFeaturedCreators.streamId, streamId),
            eq(streamFeaturedCreators.creatorId, recipientCreatorId)
          )
        );

      await WalletService.createTransaction({
        userId: recipientId,
        amount: totalCoins,
        type: 'stream_tip',
        description: `Received ${quantity}x ${gift.emoji} ${gift.name} from @${senderUsername} during stream`,
        idempotencyKey: `gift_receive_${streamGift.id}`,
      });
    } else {
      // Default: credit stream creator
      const stream = await db.query.streams.findFirst({
        where: eq(streams.id, streamId),
      });

      if (stream) {
        await WalletService.createTransaction({
          userId: stream.creatorId,
          amount: totalCoins,
          type: 'stream_tip',
          description: `Received ${quantity}x ${gift.emoji} ${gift.name} from @${senderUsername}`,
          idempotencyKey: `gift_receive_${streamGift.id}`,
        });
      }
    }

    // Update any active stream goals - all gifts contribute their coin value
    await this.updateStreamGoalProgress(streamId, totalCoins);

    return { streamGift, gift, recipientCreatorId, recipientUsername };
  }

  /**
   * Update stream goal progress when tips/gifts are received
   * All tips and virtual gifts contribute their coin value to active goals
   * @param streamId - The stream ID
   * @param coinAmount - Amount of coins received (from tip or gift value)
   */
  private static async updateStreamGoalProgress(
    streamId: string,
    coinAmount: number
  ) {
    try {
      if (coinAmount <= 0) return;

      // Get all active, incomplete goals for this stream
      const activeGoals = await db.query.streamGoals.findMany({
        where: and(
          eq(streamGoals.streamId, streamId),
          eq(streamGoals.isActive, true),
          eq(streamGoals.isCompleted, false)
        ),
      });

      // Update all active goals with the coin amount
      for (const goal of activeGoals) {
        const newAmount = goal.currentAmount + coinAmount;
        const isNowCompleted = newAmount >= goal.targetAmount;

        await db
          .update(streamGoals)
          .set({
            currentAmount: sql`${streamGoals.currentAmount} + ${coinAmount}`,
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(streamGoals.id, goal.id));
      }
    } catch (error) {
      // Log but don't fail the main transaction
      console.error('[StreamService] Error updating goal progress:', error);
    }
  }

  /**
   * Send a coin tip during a stream (without a virtual gift)
   * @param recipientCreatorId - Optional: direct the tip to a featured creator instead of stream host
   * @param recipientUsername - Optional: username of the featured creator
   * @param tipMenuItemId - Optional: tip menu item ID if this tip was from the tip menu
   * @param tipMenuItemLabel - Optional: label of the tip menu item
   */
  static async sendTip(
    streamId: string,
    senderId: string,
    senderUsername: string,
    amount: number,
    recipientCreatorId?: string,
    recipientUsername?: string,
    tipMenuItemId?: string,
    tipMenuItemLabel?: string,
    idempotencyKey?: string
  ) {
    if (amount < 1) {
      throw new Error('Minimum tip is 1 coin');
    }

    // Generate deterministic idempotency key if not provided
    // Uses 1-second precision to allow retries but block rapid double-clicks
    const finalIdempotencyKey = idempotencyKey ||
      `tip_${senderId}_${streamId}_${amount}_${Math.floor(Date.now() / 1000)}`;

    // Deduct coins from sender
    await WalletService.createTransaction({
      userId: senderId,
      amount: -amount,
      type: 'stream_tip',
      description: recipientCreatorId
        ? `Tipped ${amount} coins to @${recipientUsername}`
        : `Tipped ${amount} coins during stream`,
      idempotencyKey: finalIdempotencyKey,
    });

    // Update stream total gifts/tips
    await db
      .update(streams)
      .set({
        totalGiftsReceived: sql`${streams.totalGiftsReceived} + ${amount}`,
      })
      .where(eq(streams.id, streamId));

    // Create tip message
    const messageText = tipMenuItemLabel
      ? `tipped ${amount} coins for "${tipMenuItemLabel}"`
      : recipientCreatorId
        ? `tipped ${amount} coins to @${recipientUsername}`
        : `tipped ${amount} coins`;

    await db.insert(streamMessages).values({
      streamId,
      userId: senderId,
      username: senderUsername,
      message: messageText,
      messageType: 'gift',
      giftAmount: amount,
      tipMenuItemId: tipMenuItemId || null,
      tipMenuItemLabel: tipMenuItemLabel || null,
    });

    if (recipientCreatorId) {
      // Direct tip to featured creator - split based on host's commission rate
      const stream = await db.query.streams.findFirst({
        where: eq(streams.id, streamId),
      });

      const commissionRate = stream?.featuredCreatorCommission || 0;
      const hostAmount = Math.floor(amount * (commissionRate / 100));
      const creatorAmount = amount - hostAmount;

      // Update featured creator's tip count (full amount for display)
      await db
        .update(streamFeaturedCreators)
        .set({
          tipsReceived: sql`${streamFeaturedCreators.tipsReceived} + ${amount}`,
        })
        .where(
          and(
            eq(streamFeaturedCreators.streamId, streamId),
            eq(streamFeaturedCreators.creatorId, recipientCreatorId)
          )
        );

      // Credit featured creator their share
      if (creatorAmount > 0) {
        await WalletService.createTransaction({
          userId: recipientCreatorId,
          amount: creatorAmount,
          type: 'stream_tip',
          description: commissionRate > 0
            ? `Received ${creatorAmount} coins (${100 - commissionRate}% of ${amount} tip) from @${senderUsername}`
            : `Received ${amount} coin tip from @${senderUsername} during stream`,
          idempotencyKey: `tip_receive_${streamId}_${recipientCreatorId}_${Date.now()}`,
        });
      }

      // Credit host their commission
      if (hostAmount > 0 && stream) {
        await WalletService.createTransaction({
          userId: stream.creatorId,
          amount: hostAmount,
          type: 'stream_tip',
          description: `Commission: ${hostAmount} coins (${commissionRate}% of ${amount} tip to @${recipientUsername})`,
          idempotencyKey: `tip_commission_${streamId}_${stream.creatorId}_${Date.now()}`,
        });
      }
    } else {
      // Default: credit stream creator
      const stream = await db.query.streams.findFirst({
        where: eq(streams.id, streamId),
      });

      if (stream) {
        await WalletService.createTransaction({
          userId: stream.creatorId,
          amount: amount,
          type: 'stream_tip',
          description: `Received ${amount} coin tip from @${senderUsername}`,
          idempotencyKey: `tip_receive_${streamId}_${Date.now()}`,
        });
      }
    }

    // Update any active stream goals with coin-based progress (tips count as coins)
    await this.updateStreamGoalProgress(streamId, amount);

    // Get new balance
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, senderId),
    });

    return { newBalance: wallet?.balance || 0, recipientCreatorId, recipientUsername };
  }

  /**
   * Get chat messages for a stream
   */
  static async getMessages(streamId: string, limit: number = 100) {
    return await db.query.streamMessages.findMany({
      where: eq(streamMessages.streamId, streamId),
      orderBy: [desc(streamMessages.createdAt)],
      limit,
      with: {
        user: {
          columns: {
            avatarUrl: true,
            spendTier: true,
            lifetimeSpending: true,
          },
        },
      },
    });
  }

  /**
   * Get gift leaderboard for a stream
   */
  static async getGiftLeaderboard(streamId: string, limit: number = 10) {
    const leaderboard = await db
      .select({
        username: streamGifts.senderUsername,
        senderId: streamGifts.senderId,
        totalCoins: sql<number>`SUM(${streamGifts.totalCoins})`,
      })
      .from(streamGifts)
      .where(eq(streamGifts.streamId, streamId))
      .groupBy(streamGifts.senderId, streamGifts.senderUsername)
      .orderBy(desc(sql`SUM(${streamGifts.totalCoins})`))
      .limit(limit);

    return leaderboard;
  }

  /**
   * Get current viewers with user details
   */
  static async getCurrentViewers(streamId: string) {
    const viewers = await db.query.streamViewers.findMany({
      where: eq(streamViewers.streamId, streamId),
      orderBy: [desc(streamViewers.joinedAt)],
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Transform to include user details at top level
    // Use userId (not v.id which is the record ID) so host can invite them
    return viewers.map(v => ({
      id: v.userId || v.id, // userId for invites, fallback to record id
      username: v.user?.username || v.username,
      displayName: v.user?.displayName || null,
      avatarUrl: v.user?.avatarUrl || null,
      joinedAt: v.joinedAt,
    }));
  }

  /**
   * Get all live streams
   */
  static async getLiveStreams() {
    // First, cleanup any stale streams (no heartbeat for 2+ minutes)
    await this.cleanupStaleStreams();

    return await db.query.streams.findMany({
      where: eq(streams.status, 'live'),
      orderBy: [desc(streams.currentViewers), desc(streams.startedAt)],
      with: {
        creator: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Cleanup streams that haven't received a heartbeat in 2+ minutes
   */
  static async cleanupStaleStreams() {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    try {
      const staleStreams = await db
        .update(streams)
        .set({
          status: 'ended',
          endedAt: new Date(),
        })
        .where(
          and(
            eq(streams.status, 'live'),
            sql`(${streams.lastHeartbeat} < ${twoMinutesAgo} OR ${streams.lastHeartbeat} IS NULL)`
          )
        )
        .returning({ id: streams.id });

      if (staleStreams.length > 0) {
        console.log(`[StreamService] Cleaned up ${staleStreams.length} stale streams`);
      }
    } catch (error) {
      console.error('[StreamService] Cleanup error:', error);
      // Don't throw - cleanup is best effort
    }
  }

  /**
   * Check if a user has access to view a stream based on privacy settings
   */
  static async checkStreamAccess(streamId: string, userId: string | null): Promise<{ hasAccess: boolean; reason?: string }> {
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      with: {
        creator: {
          columns: {
            id: true,
          },
        },
      },
    });

    if (!stream) {
      return { hasAccess: false, reason: 'Stream not found' };
    }

    // Creator always has access to their own stream
    if (userId && stream.creatorId === userId) {
      return { hasAccess: true };
    }

    // Check if user is blocked by the creator
    if (userId) {
      const isBlocked = await BlockService.isBlockedByCreator(stream.creatorId, userId);
      if (isBlocked) {
        return { hasAccess: false, reason: 'You do not have access to this stream.' };
      }
    }

    // Public streams are accessible to everyone
    if (stream.privacy === 'public') {
      return { hasAccess: true };
    }

    // For followers-only and subscribers-only, user must be authenticated
    if (!userId) {
      return {
        hasAccess: false,
        reason: stream.privacy === 'followers'
          ? 'This stream is for followers only. Please follow to watch.'
          : 'This stream is for subscribers only. Please subscribe to watch.'
      };
    }

    // Check followers-only access
    if (stream.privacy === 'followers') {
      const isFollowing = await db.query.follows.findFirst({
        where: and(
          eq(follows.followerId, userId),
          eq(follows.followingId, stream.creatorId)
        ),
      });

      if (!isFollowing) {
        return { hasAccess: false, reason: 'You must follow this creator to watch this stream.' };
      }

      return { hasAccess: true };
    }

    // Check subscribers-only access
    if (stream.privacy === 'subscribers') {
      const activeSubscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.creatorId, stream.creatorId),
          eq(subscriptions.status, 'active'),
          sql`${subscriptions.expiresAt} > NOW()`
        ),
      });

      if (!activeSubscription) {
        return { hasAccess: false, reason: 'You must be an active subscriber to watch this stream.' };
      }

      return { hasAccess: true };
    }

    // Check ticketed access
    if (stream.privacy === 'ticketed') {
      if (!userId) {
        return {
          hasAccess: false,
          reason: 'This is a ticketed stream. Please purchase a ticket to watch.'
        };
      }

      const ticket = await db.query.streamTickets.findFirst({
        where: and(
          eq(streamTickets.streamId, streamId),
          eq(streamTickets.userId, userId)
        ),
      });

      if (!ticket) {
        return { hasAccess: false, reason: 'You must purchase a ticket to watch this stream.' };
      }

      return { hasAccess: true };
    }

    // Default: deny access for unknown privacy settings
    return { hasAccess: false, reason: 'Unable to verify stream access' };
  }

  /**
   * Get stream by ID
   */
  static async getStream(streamId: string) {
    return await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      with: {
        creator: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get creator's streams
   */
  static async getCreatorStreams(creatorId: string, limit: number = 20) {
    return await db.query.streams.findMany({
      where: eq(streams.creatorId, creatorId),
      orderBy: [desc(streams.createdAt)],
      limit,
    });
  }

  /**
   * Get all available gifts
   */
  static async getAllGifts() {
    return await db.query.virtualGifts.findMany({
      orderBy: [virtualGifts.coinCost],
    });
  }
}
