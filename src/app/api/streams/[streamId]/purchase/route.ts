import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, wallets, walletTransactions, notifications } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    streamId: string;
  }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const streamId = params.streamId;

    // Get price from request body
    const body = await req.json();
    const price = body.price || 0;

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

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
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if stream is private and requires payment
    if (stream.privacy === 'public') {
      return NextResponse.json(
        { error: 'This stream is free to watch' },
        { status: 400 }
      );
    }

    // Check if stream is still live
    if (stream.status !== 'live') {
      return NextResponse.json(
        { error: 'Stream is no longer live' },
        { status: 400 }
      );
    }

    // Check if user already purchased access (check wallet transactions)
    const existingPurchase = await db.query.walletTransactions.findFirst({
      where: and(
        eq(walletTransactions.userId, authUser.id),
        eq(walletTransactions.type, 'ppv_unlock'),
        eq(walletTransactions.status, 'completed')
      ),
    });

    // Additionally check if this purchase was for this specific stream
    if (existingPurchase) {
      try {
        const metadata = JSON.parse(existingPurchase.metadata as string);
        if (metadata.streamId === streamId) {
          return NextResponse.json(
            { error: 'You already have access to this stream' },
            { status: 400 }
          );
        }
      } catch (e) {
        // If metadata parsing fails, continue with purchase
      }
    }

    // Check if user is the creator (they shouldn't need to pay)
    if (authUser.id === stream.creatorId) {
      return NextResponse.json(
        { error: 'You are the creator of this stream' },
        { status: 400 }
      );
    }

    // Generate idempotency key
    const idempotencyKey = `stream_access_${authUser.id}_${streamId}_${Date.now()}`;

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
        type: 'ppv_unlock',
        status: 'completed',
        description: `Private stream access: ${stream.title}`,
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
        type: 'ppv_unlock',
        status: 'completed',
        description: `Stream access sold`,
        relatedTransactionId: buyerTransaction.id,
        metadata: JSON.stringify({
          streamId: stream.id,
          buyerId: authUser.id,
        }),
      });

      // 5. Create notification for creator
      await tx.insert(notifications).values({
        userId: stream.creatorId,
        type: 'stream_purchase',
        title: 'New Stream Access Purchase!',
        message: `Someone purchased access to your private stream for ${price} coins!`,
        metadata: JSON.stringify({
          streamId: stream.id,
          amount: price,
          buyerId: authUser.id,
        }),
      });

      return {
        newBalance: userWallet.balance - price,
      };
    });

    return NextResponse.json({
      success: true,
      accessGranted: true,
      newBalance: result.newBalance,
      message: `Access granted! You can now watch ${stream.title}`,
    });
  } catch (error) {
    console.error('[streams/purchase] Error:', error);

    // Handle insufficient balance error from transaction
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, required, current] = error.message.split(':');
      return NextResponse.json(
        { error: 'Insufficient balance', required: Number(required), current: Number(current) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to purchase stream access' },
      { status: 500 }
    );
  }
}
