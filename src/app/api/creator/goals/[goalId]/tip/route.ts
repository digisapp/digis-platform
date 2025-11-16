import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, users, notifications, creatorGoals } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Tip toward a specific profile goal
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ goalId: string }> }
) {
  try {
    const params = await props.params;
    const goalId = params.goalId;
    const { amount, message } = await req.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid tip amount' },
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

    // Get the goal
    const goal = await db.query.creatorGoals.findFirst({
      where: eq(creatorGoals.id, goalId),
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    if (!goal.isActive) {
      return NextResponse.json(
        { error: 'Goal is not active' },
        { status: 400 }
      );
    }

    // Cannot tip toward your own goal
    if (authUser.id === goal.creatorId) {
      return NextResponse.json(
        { error: 'Cannot tip toward your own goal' },
        { status: 400 }
      );
    }

    // Get receiver (creator) info
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, goal.creatorId),
      columns: {
        id: true,
        username: true,
        displayName: true,
      },
    });

    if (!receiver) {
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
    const idempotencyKey = `goal_tip_${authUser.id}_${goalId}_${Date.now()}`;

    // Start transaction
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
      const [newWallet] = await db.insert(wallets).values({
        userId: receiver.id,
        balance: amount,
      }).returning();
      receiverWallet = newWallet;
    } else {
      await db
        .update(wallets)
        .set({
          balance: receiverWallet.balance + amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, receiver.id));
    }

    // 3. Update goal progress and track tipper
    const newCurrentAmount = goal.currentAmount + amount;
    const isNowCompleted = newCurrentAmount >= goal.targetAmount;

    // Parse existing tippers from metadata
    let tippers: Array<{ userId: string; username: string; displayName: string | null; avatarUrl: string | null; totalAmount: number }> = [];
    if (goal.metadata) {
      try {
        const metadata = JSON.parse(goal.metadata);
        tippers = metadata.tippers || [];
      } catch (e) {
        console.error('Failed to parse goal metadata:', e);
      }
    }

    // Update or add tipper
    const existingTipper = tippers.find(t => t.userId === authUser.id);
    if (existingTipper) {
      existingTipper.totalAmount += amount;
      existingTipper.username = sender?.username || existingTipper.username;
      existingTipper.displayName = sender?.displayName || existingTipper.displayName;
    } else {
      // Get user's avatar
      const tipperUser = await db.query.users.findFirst({
        where: eq(users.id, authUser.id),
        columns: {
          avatarUrl: true,
        },
      });

      tippers.push({
        userId: authUser.id,
        username: sender?.username || 'Anonymous',
        displayName: sender?.displayName || null,
        avatarUrl: tipperUser?.avatarUrl || null,
        totalAmount: amount,
      });
    }

    // Sort tippers by total amount (descending)
    tippers.sort((a, b) => b.totalAmount - a.totalAmount);

    await db
      .update(creatorGoals)
      .set({
        currentAmount: newCurrentAmount,
        isCompleted: isNowCompleted,
        completedAt: isNowCompleted && !goal.isCompleted ? new Date() : goal.completedAt,
        metadata: JSON.stringify({ tippers }),
        updatedAt: new Date(),
      })
      .where(eq(creatorGoals.id, goalId));

    // 4. Create wallet transactions (using 'dm_tip' type with goal metadata)
    const [senderTransaction] = await db.insert(walletTransactions).values({
      userId: authUser.id,
      amount: -amount,
      type: 'dm_tip',
      status: 'completed',
      description: `Tip toward goal: ${goal.title}${message ? ' - ' + message : ''}`,
      idempotencyKey,
      metadata: JSON.stringify({
        recipientId: receiver.id,
        recipientUsername: receiver.username,
        goalId: goal.id,
        goalTitle: goal.title,
        isGoalTip: true,
        message: message || null,
      }),
    }).returning();

    await db.insert(walletTransactions).values({
      userId: receiver.id,
      amount: amount,
      type: 'dm_tip',
      status: 'completed',
      description: `Goal tip from ${sender?.displayName || sender?.username || 'a fan'}: ${goal.title}${message ? ' - ' + message : ''}`,
      relatedTransactionId: senderTransaction.id,
      metadata: JSON.stringify({
        senderId: authUser.id,
        senderUsername: sender?.username,
        goalId: goal.id,
        goalTitle: goal.title,
        isGoalTip: true,
        message: message || null,
      }),
    });

    // 5. Create notification for receiver
    const notificationMessage = isNowCompleted
      ? `🎉 Goal completed! ${sender?.displayName || sender?.username || 'Someone'} tipped ${amount} coins toward "${goal.title}" and helped you reach your goal!`
      : `${sender?.displayName || sender?.username || 'Someone'} tipped ${amount} coins toward your goal "${goal.title}"!${message ? ' "' + message + '"' : ''}`;

    await db.insert(notifications).values({
      userId: receiver.id,
      type: 'tip_received',
      title: isNowCompleted ? '🎉 Goal Completed!' : 'Goal Tip Received!',
      message: notificationMessage,
      metadata: JSON.stringify({
        amount,
        senderId: authUser.id,
        senderUsername: sender?.username,
        goalId: goal.id,
        goalTitle: goal.title,
        goalCompleted: isNowCompleted,
        isGoalTip: true,
        message: message || null,
      }),
    });

    return NextResponse.json({
      success: true,
      amount,
      goalId: goal.id,
      goalTitle: goal.title,
      newCurrentAmount,
      targetAmount: goal.targetAmount,
      goalCompleted: isNowCompleted,
      newBalance: senderWallet.balance - amount,
      transactionId: senderTransaction.id,
      message: `Sent ${amount} coins toward ${receiver.displayName || receiver.username}'s goal`,
    });
  } catch (error) {
    console.error('[goals/tip] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process goal tip' },
      { status: 500 }
    );
  }
}
