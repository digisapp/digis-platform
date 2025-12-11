import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, users, notifications, creatorGoals } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

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

    // Get sender info (outside transaction)
    const sender = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // Generate idempotency key to prevent double-charges
    const idempotencyKey = `goal_tip_${authUser.id}_${goalId}_${Date.now()}`;

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

      // 3. Get or create receiver wallet and credit atomically
      const receiverWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, receiver.id),
      });

      if (!receiverWallet) {
        await tx.insert(wallets).values({
          userId: receiver.id,
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
          .where(eq(wallets.userId, receiver.id));
      }

      // 4. Update goal progress atomically using SQL expression
      // First get current goal state inside transaction
      const currentGoal = await tx.query.creatorGoals.findFirst({
        where: eq(creatorGoals.id, goalId),
      });

      if (!currentGoal) {
        throw new Error('Goal not found');
      }

      const newCurrentAmount = currentGoal.currentAmount + amount;
      const isNowCompleted = newCurrentAmount >= currentGoal.targetAmount;

      // Parse existing tippers from metadata
      let tippers: Array<{ userId: string; username: string; displayName: string | null; avatarUrl: string | null; totalAmount: number }> = [];
      if (currentGoal.metadata) {
        try {
          const metadata = JSON.parse(currentGoal.metadata);
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
        tippers.push({
          userId: authUser.id,
          username: sender?.username || 'Anonymous',
          displayName: sender?.displayName || null,
          avatarUrl: sender?.avatarUrl || null,
          totalAmount: amount,
        });
      }

      // Sort tippers by total amount (descending)
      tippers.sort((a, b) => b.totalAmount - a.totalAmount);

      // Update goal with SQL expression for currentAmount to prevent race conditions
      await tx
        .update(creatorGoals)
        .set({
          currentAmount: sql`${creatorGoals.currentAmount} + ${amount}`,
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted && !currentGoal.isCompleted ? new Date() : currentGoal.completedAt,
          metadata: JSON.stringify({ tippers }),
          updatedAt: new Date(),
        })
        .where(eq(creatorGoals.id, goalId));

      // 5. Create wallet transactions (using 'dm_tip' type with goal metadata)
      const [senderTransaction] = await tx.insert(walletTransactions).values({
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

      await tx.insert(walletTransactions).values({
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

      // 6. Create notification for receiver
      const notificationMessage = isNowCompleted
        ? `🎉 Goal completed! ${sender?.displayName || sender?.username || 'Someone'} tipped ${amount} coins toward "${goal.title}" and helped you reach your goal!`
        : `${sender?.displayName || sender?.username || 'Someone'} tipped ${amount} coins toward your goal "${goal.title}"!${message ? ' "' + message + '"' : ''}`;

      await tx.insert(notifications).values({
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

      return {
        transactionId: senderTransaction.id,
        newBalance: senderWallet.balance - amount,
        newCurrentAmount,
        isNowCompleted,
      };
    });

    return NextResponse.json({
      success: true,
      amount,
      goalId: goal.id,
      goalTitle: goal.title,
      newCurrentAmount: result.newCurrentAmount,
      targetAmount: goal.targetAmount,
      goalCompleted: result.isNowCompleted,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      message: `Sent ${amount} coins toward ${receiver.displayName || receiver.username}'s goal`,
    });
  } catch (error) {
    console.error('[goals/tip] Error:', error);

    // Handle insufficient balance error from transaction
    if (error instanceof Error && error.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, required, current] = error.message.split(':');
      return NextResponse.json(
        { error: 'Insufficient balance', required: Number(required), current: Number(current) },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process goal tip' },
      { status: 500 }
    );
  }
}
