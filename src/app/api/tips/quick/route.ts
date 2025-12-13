import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, streams, users, notifications, streamGoals, streamMessages } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { withIdempotency } from '@/lib/idempotency';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: very strict for tips (10 req/min)
    const rl = await rateLimit(req, 'tips:quick');
    if (!rl.ok) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: rl.headers
      });
    }

    // Get idempotency key from header (client-generated)
    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency-Key header required' },
        { status: 400, headers: rl.headers }
      );
    }

    // Wrap the entire tip processing in idempotency check
    return await withIdempotency(`tips:${idempotencyKey}`, 60000, async () => {
      const { amount, streamId, note, tipMenuItemId, tipMenuItemLabel } = await req.json();

    // Validate input
    if (!amount || !streamId || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount or stream ID' },
        { status: 400 }
      );
    }

    // Sanitize note (max 200 chars, trim whitespace)
    const sanitizedNote = note ? String(note).trim().slice(0, 200) : null;

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

    // Get sender info
    const sender = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    // Execute all financial operations in a single atomic transaction
    const result = await db.transaction(async (tx) => {
      // 1. Check sender's wallet balance inside transaction to prevent race conditions
      const senderWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, authUser.id),
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error(`INSUFFICIENT_BALANCE:${amount}:${senderWallet?.balance || 0}`);
      }

      // 2. Deduct from sender using SQL expression
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, authUser.id));

      // 3. Get or create creator wallet and credit atomically
      const creatorWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, creator.id),
      });

      if (!creatorWallet) {
        await tx.insert(wallets).values({
          userId: creator.id,
          balance: amount,
          heldBalance: 0,
        });
      } else {
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, creator.id));
      }

      // 4. Create wallet transactions for both parties
      const [senderTransaction] = await tx.insert(walletTransactions).values({
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

      await tx.insert(walletTransactions).values({
        userId: creator.id,
        amount: amount,
        type: 'stream_tip',
        status: 'completed',
        description: `Tip received from @${sender?.username || 'anonymous'} on stream`,
        relatedTransactionId: senderTransaction.id,
        metadata: JSON.stringify({
          streamId: stream.id,
          streamTitle: stream.title,
          senderId: authUser.id,
          senderUsername: sender?.username,
        }),
      });

      // 5. Create notification for creator
      await tx.insert(notifications).values({
        userId: creator.id,
        type: 'tip_received',
        title: 'New Tip!',
        message: sanitizedNote
          ? `@${sender?.username || 'Someone'} sent you ${amount} coins: "${sanitizedNote}"`
          : `@${sender?.username || 'Someone'} sent you ${amount} coins during your stream!`,
        metadata: JSON.stringify({
          amount,
          streamId: stream.id,
          senderId: authUser.id,
          senderUsername: sender?.username,
          note: sanitizedNote,
        }),
      });

      return {
        transactionId: senderTransaction.id,
        newBalance: senderWallet.balance - amount,
      };
    });

    // Broadcast tip to stream chat via Ably (outside transaction - non-critical)
    await AblyRealtimeService.broadcastTip(streamId, {
      senderId: authUser.id,
      senderUsername: sender?.username || 'Anonymous',
      senderAvatarUrl: null,
      amount,
    });

    // If there's a note, broadcast private tip notification to creator only
    if (sanitizedNote) {
      await AblyRealtimeService.broadcastPrivateTipNote(creator.id, streamId, {
        senderId: authUser.id,
        senderUsername: sender?.username || 'Anonymous',
        senderAvatarUrl: null,
        amount,
        note: sanitizedNote,
      });
    }

    // Record tip in stream messages for tracking and summary
    try {
      const messageText = tipMenuItemLabel
        ? `tipped ${amount} coins for "${tipMenuItemLabel}"`
        : `tipped ${amount} coins`;

      await db.insert(streamMessages).values({
        streamId,
        userId: authUser.id,
        username: sender?.username || 'Anonymous',
        message: messageText,
        messageType: 'tip',
        giftAmount: amount,
        tipMenuItemId: tipMenuItemId || null,
        tipMenuItemLabel: tipMenuItemLabel || null,
      });

      // Update stream total tips
      await db
        .update(streams)
        .set({
          totalGiftsReceived: sql`${streams.totalGiftsReceived} + ${amount}`,
        })
        .where(eq(streams.id, streamId));
    } catch (msgError) {
      console.error('[tips/quick] Error recording tip message:', msgError);
      // Don't fail the tip if message insert fails
    }

    // Update stream goal progress with tip amount
    try {
      const activeGoals = await db.query.streamGoals.findMany({
        where: and(
          eq(streamGoals.streamId, streamId),
          eq(streamGoals.isActive, true),
          eq(streamGoals.isCompleted, false)
        ),
      });

      for (const goal of activeGoals) {
        const newAmount = goal.currentAmount + amount;
        const isNowCompleted = newAmount >= goal.targetAmount;

        await db
          .update(streamGoals)
          .set({
            currentAmount: sql`${streamGoals.currentAmount} + ${amount}`,
            isCompleted: isNowCompleted,
            completedAt: isNowCompleted ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(streamGoals.id, goal.id));
      }

      // Broadcast goal update via Ably if goals were updated
      if (activeGoals.length > 0) {
        // Broadcast update for each goal that was modified
        for (const goal of activeGoals) {
          const newAmount = goal.currentAmount + amount;
          const isNowCompleted = newAmount >= goal.targetAmount;
          await AblyRealtimeService.broadcastGoalUpdate(streamId, {
            ...goal,
            currentAmount: newAmount,
            isCompleted: isNowCompleted,
          }, isNowCompleted ? 'completed' : 'updated');
        }
      }
    } catch (goalError) {
      console.error('[tips/quick] Error updating goal progress:', goalError);
      // Don't fail the tip if goal update fails
    }

      return NextResponse.json({
        success: true,
        amount,
        newBalance: result.newBalance,
        transactionId: result.transactionId,
        message: `Sent ${amount} coins to ${creator.displayName || creator.username}`,
      }, { headers: rl.headers });
    }); // end withIdempotency
  } catch (error) {
    console.error('[tips/quick] Error:', error);

    // Handle insufficient balance error from transaction
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, required, current] = error.message.split(':');
      return NextResponse.json(
        { error: 'Insufficient balance', required: Number(required), current: Number(current) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process tip' },
      { status: 500 }
    );
  }
}
