import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, users, notifications } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';
import { z } from 'zod';
import { validateBody, uuidSchema, coinAmountSchema } from '@/lib/validation/schemas';
import { walletLogger, extractError } from '@/lib/logging/logger';

// Tip-specific schema
const tipSendSchema = z.object({
  amount: coinAmountSchema,
  receiverId: uuidSchema,
  message: z.string().max(500, 'Message too long').optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get current user first for rate limiting by user ID
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit financial operations
    const rateCheck = await rateLimitFinancial(authUser.id, 'tip');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) }
        }
      );
    }

    // Validate input with Zod
    const validation = await validateBody(req, tipSendSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { amount, receiverId, message } = validation.data;

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
        role: true,
      },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    // Only creators can receive tips
    if (receiver.role !== 'creator') {
      return NextResponse.json(
        { error: 'Tips can only be sent to creators' },
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

    // Execute all financial operations in a single atomic transaction
    const result = await db.transaction(async (tx) => {
      // 1. Check sender's wallet balance (inside transaction to prevent race conditions)
      const senderWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, authUser.id),
      });

      if (!senderWallet || senderWallet.balance < amount) {
        throw new Error(`INSUFFICIENT_BALANCE:${amount}:${senderWallet?.balance || 0}`);
      }

      // 2. Deduct from sender using SQL expression to prevent race conditions
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
        // Create wallet for receiver if doesn't exist
        await tx.insert(wallets).values({
          userId: receiver.id,
          balance: amount,
          heldBalance: 0,
        });
      } else {
        // Update receiver wallet using SQL expression
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, receiver.id));
      }

      // 4. Create wallet transactions for both parties
      const [senderTransaction] = await tx.insert(walletTransactions).values({
        userId: authUser.id,
        amount: -amount,
        type: 'dm_tip',
        status: 'completed',
        description: `Tip to ${receiver.displayName || receiver.username}${message ? ': ' + message : ''}`,
        idempotencyKey,
        metadata: JSON.stringify({
          recipientId: receiver.id,
          recipientUsername: receiver.username,
          message: message || null,
        }),
      }).returning();

      await tx.insert(walletTransactions).values({
        userId: receiver.id,
        amount: amount,
        type: 'dm_tip',
        status: 'completed',
        description: `Tip received from ${sender?.displayName || sender?.username || 'a fan'}${message ? ': ' + message : ''}`,
        relatedTransactionId: senderTransaction.id,
        metadata: JSON.stringify({
          senderId: authUser.id,
          senderUsername: sender?.username,
          message: message || null,
        }),
      });

      // 5. Create notification for receiver
      await tx.insert(notifications).values({
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

      return {
        transactionId: senderTransaction.id,
        newBalance: senderWallet.balance - amount,
      };
    });

    // Log successful tip
    walletLogger.info('Tip sent successfully', {
      userId: authUser.id,
      action: 'tip_sent',
      amount,
      recipientId: receiver.id,
      transactionId: result.transactionId,
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      message: `Sent ${amount} coins to ${receiver.displayName || receiver.username}`,
    });
  } catch (error) {
    const err = extractError(error);

    // Handle insufficient balance error from transaction
    if (err.message.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, required, current] = err.message.split(':');
      walletLogger.warn('Tip failed - insufficient balance', {
        userId: authUser?.id,
        action: 'tip_failed',
        reason: 'insufficient_balance',
        required: Number(required),
        current: Number(current),
      });
      return NextResponse.json(
        { error: 'Insufficient balance', required: Number(required), current: Number(current) },
        { status: 400 }
      );
    }

    // Log error
    walletLogger.error('Tip failed', {
      userId: authUser?.id,
      action: 'tip_failed',
      route: '/api/tips/send',
    }, err);

    return NextResponse.json(
      { error: 'Failed to process tip' },
      { status: 500 }
    );
  }
}
