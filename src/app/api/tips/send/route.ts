import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, users, notifications } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { amount, receiverId, message } = await req.json();

    // Validate input
    if (!amount || !receiverId || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount or receiver ID' },
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

    // Cannot tip yourself
    if (authUser.id === receiverId) {
      return NextResponse.json(
        { error: 'Cannot tip yourself' },
        { status: 400 }
      );
    }

    // Get receiver info
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, receiverId),
      columns: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
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

    // Get sender info
    const sender = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    // Generate idempotency key to prevent double-charges
    const idempotencyKey = `tip_${authUser.id}_${receiverId}_${Date.now()}`;

    // Start transaction: Deduct from sender, credit to receiver
    // 1. Deduct from sender
    await db
      .update(wallets)
      .set({
        balance: senderWallet.balance - amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, authUser.id));

    // 2. Get or create receiver wallet
    let receiverWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, receiver.id),
    });

    if (!receiverWallet) {
      // Create wallet for receiver if doesn't exist
      const [newWallet] = await db.insert(wallets).values({
        userId: receiver.id,
        balance: amount,
      }).returning();
      receiverWallet = newWallet;
    } else {
      // Update receiver wallet
      await db
        .update(wallets)
        .set({
          balance: receiverWallet.balance + amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, receiver.id));
    }

    // 3. Create wallet transactions for both parties
    const [senderTransaction] = await db.insert(walletTransactions).values({
      userId: authUser.id,
      amount: -amount,
      type: 'tip',
      status: 'completed',
      description: `Tip to ${receiver.displayName || receiver.username}${message ? ': ' + message : ''}`,
      idempotencyKey,
      metadata: JSON.stringify({
        recipientId: receiver.id,
        recipientUsername: receiver.username,
        message: message || null,
      }),
    }).returning();

    const [receiverTransaction] = await db.insert(walletTransactions).values({
      userId: receiver.id,
      amount: amount,
      type: 'tip',
      status: 'completed',
      description: `Tip received from ${sender?.displayName || sender?.username || 'a fan'}${message ? ': ' + message : ''}`,
      relatedTransactionId: senderTransaction.id,
      metadata: JSON.stringify({
        senderId: authUser.id,
        senderUsername: sender?.username,
        message: message || null,
      }),
    }).returning();

    // 4. Create notification for receiver
    await db.insert(notifications).values({
      userId: receiver.id,
      type: 'tip_received',
      title: 'New Tip!',
      message: `${sender?.displayName || sender?.username || 'Someone'} sent you ${amount} coins!${message ? ' "' + message + '"' : ''}`,
      metadata: JSON.stringify({
        amount,
        senderId: authUser.id,
        senderUsername: sender?.username,
        message: message || null,
      }),
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance: senderWallet.balance - amount,
      transactionId: senderTransaction.id,
      message: `Sent ${amount} coins to ${receiver.displayName || receiver.username}`,
    });
  } catch (error) {
    console.error('[tips/send] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process tip' },
      { status: 500 }
    );
  }
}
