import { NextResponse } from 'next/server';
import { db, walletTransactions } from '@/lib/data/system';
import { wallets, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { FinancialAuditService } from '@/lib/services/financial-audit-service';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

// Admin-only: Get wallet balance for a user
export const GET = withAdmin(async ({ request }) => {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const [wallet, targetUser] = await Promise.all([
      db.query.wallets.findFirst({ where: eq(wallets.userId, userId) }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, username: true, displayName: true },
      }),
    ]);

    return NextResponse.json({
      user: targetUser,
      wallet: wallet || { balance: 0, heldBalance: 0 },
    });
  } catch (error: any) {
    console.error('[ADMIN WALLET GET]', error);
    return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 });
  }
});

// Admin-only: Set wallet balance for a user (with row locking)
export const POST = withAdmin(async ({ user, request }) => {
  try {
    const { userId, balance, reason } = await request.json();

    if (!userId || balance === undefined) {
      return NextResponse.json({ error: 'userId and balance required' }, { status: 400 });
    }

    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json({ error: 'balance must be a non-negative number' }, { status: 400 });
    }

    // Get admin user info for audit trail
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { username: true },
    });

    const idempotencyKey = `admin_adjust_${userId}_${Date.now()}`;
    const adjustmentReason = reason || 'Admin adjustment';

    // Use transaction with row locking to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Lock the wallet row
      const lockedRows = await tx.execute(
        sql`SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE`
      );
      const existingWallet = (lockedRows as unknown as Array<{ balance: number }>)[0];

      const previousBalance = existingWallet?.balance ?? 0;
      const adjustmentAmount = balance - previousBalance;

      if (existingWallet) {
        await tx
          .update(wallets)
          .set({ balance, updatedAt: new Date() })
          .where(eq(wallets.userId, userId));
      } else {
        await tx.insert(wallets).values({
          userId,
          balance,
          heldBalance: 0,
        });
      }

      // Create audit transaction record
      await tx.insert(walletTransactions).values({
        userId,
        amount: adjustmentAmount,
        type: 'refund',
        status: 'completed',
        description: `Admin adjustment by @${adminUser?.username || 'admin'}: ${adjustmentReason}`,
        metadata: JSON.stringify({
          adminId: user.id,
          adminUsername: adminUser?.username,
          previousBalance,
          newBalance: balance,
          reason: adjustmentReason,
          isAdminAdjustment: true,
        }),
        idempotencyKey,
      });

      return { previousBalance, adjustmentAmount };
    });

    // Fire-and-forget audit log
    FinancialAuditService.log({
      eventType: 'admin_refund',
      actorId: userId,
      adminId: user.id,
      amount: result.adjustmentAmount,
      idempotencyKey,
      actorBalanceBefore: result.previousBalance,
      actorBalanceAfter: balance,
      description: `Admin wallet adjustment: ${adjustmentReason}`,
      metadata: {
        previousBalance: result.previousBalance,
        newBalance: balance,
        reason: adjustmentReason,
        adminUsername: adminUser?.username,
      },
    }).catch(err => {
      console.error('[ADMIN WALLET] Audit log failed:', err);
    });

    console.log(`[ADMIN WALLET] Admin ${user.id} adjusted balance for user ${userId}: ${result.previousBalance} -> ${balance} (${result.adjustmentAmount >= 0 ? '+' : ''}${result.adjustmentAmount}). Reason: ${adjustmentReason}`);

    return NextResponse.json({
      success: true,
      userId,
      previousBalance: result.previousBalance,
      newBalance: balance,
      adjustment: result.adjustmentAmount,
    });
  } catch (error: any) {
    console.error('[ADMIN WALLET POST]', error);
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
  }
});
