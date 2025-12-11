import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, streamTickets, wallets, walletTransactions, notifications, users } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    streamId: string;
  }>;
}

// GET - Check if user has a ticket for this stream
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const streamId = params.streamId;

    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ hasTicket: false });
    }

    // Check if user has a ticket
    const ticket = await db.query.streamTickets.findFirst({
      where: and(
        eq(streamTickets.streamId, streamId),
        eq(streamTickets.userId, authUser.id)
      ),
    });

    // Get stream details
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: {
        id: true,
        creatorId: true,
        ticketPrice: true,
        privacy: true,
      },
    });

    // Creator always has access
    const isCreator = stream?.creatorId === authUser.id;

    return NextResponse.json({
      hasTicket: !!ticket || isCreator,
      isCreator,
      ticketPrice: stream?.ticketPrice || null,
      isTicketed: stream?.privacy === 'ticketed',
    });
  } catch (error) {
    console.error('[streams/ticket] GET Error:', error);
    return NextResponse.json({ hasTicket: false }, { status: 500 });
  }
}

// POST - Purchase a ticket for this stream
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const streamId = params.streamId;

    // Get current user
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get stream details
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: {
        id: true,
        creatorId: true,
        title: true,
        privacy: true,
        status: true,
        ticketPrice: true,
        ticketsSold: true,
        ticketRevenue: true,
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if stream is ticketed
    if (stream.privacy !== 'ticketed' || !stream.ticketPrice) {
      return NextResponse.json(
        { error: 'This stream is not ticketed' },
        { status: 400 }
      );
    }

    const price = stream.ticketPrice;

    // Check if user is the creator (they don't need a ticket)
    if (authUser.id === stream.creatorId) {
      return NextResponse.json(
        { error: 'You are the creator of this stream' },
        { status: 400 }
      );
    }

    // Check if user already has a ticket
    const existingTicket = await db.query.streamTickets.findFirst({
      where: and(
        eq(streamTickets.streamId, streamId),
        eq(streamTickets.userId, authUser.id)
      ),
    });

    if (existingTicket) {
      return NextResponse.json(
        { error: 'You already have a ticket for this stream' },
        { status: 400 }
      );
    }

    // Get buyer username for notification (outside transaction)
    const buyer = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: { username: true },
    });

    // Generate idempotency key
    const idempotencyKey = `ticket_${authUser.id}_${streamId}_${Date.now()}`;

    // Execute all financial operations in a single atomic transaction
    const result = await db.transaction(async (tx) => {
      // 1. Check user's wallet balance inside transaction to prevent race conditions
      const userWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, authUser.id),
      });

      if (!userWallet || userWallet.balance < price) {
        throw new Error(`INSUFFICIENT_BALANCE:${price}:${userWallet?.balance || 0}`);
      }

      // 2. Deduct from buyer using SQL expression
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${price}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, authUser.id));

      // 3. Get or create creator wallet and credit atomically
      const creatorWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, stream.creatorId),
      });

      if (!creatorWallet) {
        await tx.insert(wallets).values({
          userId: stream.creatorId,
          balance: price,
          heldBalance: 0,
        });
      } else {
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${price}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, stream.creatorId));
      }

      // 4. Create wallet transactions for both parties
      const [buyerTransaction] = await tx.insert(walletTransactions).values({
        userId: authUser.id,
        amount: -price,
        type: 'stream_ticket',
        status: 'completed',
        description: `Ticket for stream: ${stream.title}`,
        idempotencyKey,
        metadata: JSON.stringify({
          streamId: stream.id,
          streamTitle: stream.title,
          creatorId: stream.creatorId,
        }),
      }).returning();

      await tx.insert(walletTransactions).values({
        userId: stream.creatorId,
        amount: price,
        type: 'stream_ticket',
        status: 'completed',
        description: `Ticket sold for stream: ${stream.title}`,
        relatedTransactionId: buyerTransaction.id,
        metadata: JSON.stringify({
          streamId: stream.id,
          buyerId: authUser.id,
        }),
      });

      // 5. Create ticket record
      const [ticket] = await tx.insert(streamTickets).values({
        streamId: stream.id,
        userId: authUser.id,
        pricePaid: price,
        transactionId: buyerTransaction.id,
      }).returning();

      // 6. Update stream ticket stats using SQL expressions
      await tx
        .update(streams)
        .set({
          ticketsSold: sql`COALESCE(${streams.ticketsSold}, 0) + 1`,
          ticketRevenue: sql`COALESCE(${streams.ticketRevenue}, 0) + ${price}`,
          updatedAt: new Date(),
        })
        .where(eq(streams.id, streamId));

      // 7. Create notification for creator
      await tx.insert(notifications).values({
        userId: stream.creatorId,
        type: 'stream_ticket',
        title: 'New Ticket Sold!',
        message: `@${buyer?.username || 'Someone'} purchased a ticket for ${price} coins!`,
        metadata: JSON.stringify({
          streamId: stream.id,
          amount: price,
          buyerId: authUser.id,
          ticketId: ticket.id,
        }),
      });

      return {
        ticket,
        newBalance: userWallet.balance - price,
      };
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: result.ticket.id,
        streamId: result.ticket.streamId,
        pricePaid: result.ticket.pricePaid,
        purchasedAt: result.ticket.purchasedAt,
      },
      newBalance: result.newBalance,
      message: `Ticket purchased! You can now watch ${stream.title}`,
    });
  } catch (error) {
    console.error('[streams/ticket] POST Error:', error);

    // Handle insufficient balance error from transaction
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, required, current] = error.message.split(':');
      return NextResponse.json(
        { error: 'Insufficient balance', required: Number(required), current: Number(current) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to purchase ticket' },
      { status: 500 }
    );
  }
}
