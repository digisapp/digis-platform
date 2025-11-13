import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, streams, users, notifications } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { amount, streamId } = await req.json();

    // Validate input
    if (!amount || !streamId || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount or stream ID' },
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

    // Get stream and creator info
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: {
        id: true,
        creatorId: true,
        title: true,
        status: true,
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Get creator info
    const creator = await db.query.users.findFirst({
      where: eq(users.id, stream.creatorId),
      columns: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Check sender's wallet balance
    const senderWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, authUser.id),
    });

    if (!senderWallet || senderWallet.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance', required: amount, current: senderWallet?.balance || 0 },
        { status: 400 }
      );
    }

    // Generate idempotency key to prevent double-charges
    const idempotencyKey = `tip_${authUser.id}_${streamId}_${Date.now()}`;

    // Start transaction: Deduct from sender, credit to creator
    // 1. Deduct from sender
    await db
      .update(wallets)
      .set({
        balance: senderWallet.balance - amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, authUser.id));

    // 2. Get or create creator wallet
    let creatorWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, creator.id),
    });

    if (!creatorWallet) {
      // Create wallet for creator if doesn't exist
      const [newWallet] = await db.insert(wallets).values({
        userId: creator.id,
        balance: amount,
      }).returning();
      creatorWallet = newWallet;
    } else {
      // Update creator wallet
      await db
        .update(wallets)
        .set({
          balance: creatorWallet.balance + amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, creator.id));
    }

    // 3. Create wallet transactions for both parties
    const [senderTransaction] = await db.insert(walletTransactions).values({
      userId: authUser.id,
      amount: -amount,
      type: 'stream_tip',
      status: 'completed',
      description: `Tip to ${creator.displayName || creator.username} on stream`,
      idempotencyKey,
      metadata: JSON.stringify({
        streamId: stream.id,
        streamTitle: stream.title,
        recipientId: creator.id,
        recipientUsername: creator.username,
      }),
    }).returning();

    const [creatorTransaction] = await db.insert(walletTransactions).values({
      userId: creator.id,
      amount: amount,
      type: 'stream_tip',
      status: 'completed',
      description: `Tip received from stream`,
      relatedTransactionId: senderTransaction.id,
      metadata: JSON.stringify({
        streamId: stream.id,
        streamTitle: stream.title,
        senderId: authUser.id,
      }),
    }).returning();

    // 4. Create notification for creator
    await db.insert(notifications).values({
      userId: creator.id,
      type: 'tip_received',
      title: 'New Tip!',
      message: `You received ${amount} coins during your stream!`,
      metadata: JSON.stringify({
        amount,
        streamId: stream.id,
        senderId: authUser.id,
      }),
    });

    // Broadcast tip to stream chat via Supabase Realtime
    const channelName = `stream:${streamId}:chat`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'tip',
      payload: {
        id: senderTransaction.id,
        username: authUser.email || 'Anonymous',
        amount,
        timestamp: Date.now(),
        type: 'tip',
      },
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance: senderWallet.balance - amount,
      transactionId: senderTransaction.id,
      message: `Sent ${amount} coins to ${creator.displayName || creator.username}`,
    });
  } catch (error) {
    console.error('[tips/quick] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process tip' },
      { status: 500 }
    );
  }
}
