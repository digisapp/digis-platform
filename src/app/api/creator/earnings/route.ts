import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, wallets, walletTransactions, payoutRequests, users } from '@/lib/data/system';
import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/creator/earnings - Get creator's earnings data
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is creator (direct DB query instead of HTTP call)
    const dbUser = await withTimeoutAndRetry(
      () => db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { role: true },
      }),
      { timeoutMs: 5000, retries: 1, tag: 'earningsUser' }
    );

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can access earnings' }, { status: 403 });
    }

    // Run ALL queries in parallel for maximum performance
    const [
      wallet,
      earningsByTypeResult,
      pendingPayout,
      recentTransactions,
    ] = await withTimeoutAndRetry(
      () => Promise.all([
        // Get wallet balance
        db.query.wallets.findFirst({
          where: eq(wallets.userId, user.id),
        }),

        // Get earnings breakdown by type using SQL GROUP BY (instead of fetching all rows)
        db.select({
          type: walletTransactions.type,
          total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)`,
        })
          .from(walletTransactions)
          .where(and(
            eq(walletTransactions.userId, user.id),
            eq(walletTransactions.status, 'completed'),
            gt(walletTransactions.amount, 0)
          ))
          .groupBy(walletTransactions.type),

        // Get pending payout
        db.query.payoutRequests.findFirst({
          where: and(
            eq(payoutRequests.creatorId, user.id),
            eq(payoutRequests.status, 'pending')
          ),
          orderBy: [desc(payoutRequests.requestedAt)],
        }),

        // Get recent transactions (last 50 only)
        db.query.walletTransactions.findMany({
          where: and(
            eq(walletTransactions.userId, user.id),
            eq(walletTransactions.status, 'completed')
          ),
          orderBy: [desc(walletTransactions.createdAt)],
          limit: 50,
        }),
      ]),
      { timeoutMs: 10000, retries: 1, tag: 'creatorEarnings' }
    );

    const balance = wallet?.balance || 0;
    const heldBalance = wallet?.heldBalance || 0;
    const availableBalance = balance - heldBalance;

    // Process SQL aggregation results into earningsByType object
    const earningsByType = {
      call_earnings: 0,
      message_earnings: 0,
      stream_tip: 0,
      subscription_earnings: 0,
    };

    let totalEarnings = 0;

    earningsByTypeResult.forEach((row) => {
      const amount = Number(row.total) || 0;
      totalEarnings += amount;

      if (row.type in earningsByType) {
        earningsByType[row.type as keyof typeof earningsByType] = amount;
      }
    });

    return NextResponse.json({
      balance,
      heldBalance,
      availableBalance,
      totalEarnings,
      pendingPayout: pendingPayout ? {
        amount: pendingPayout.amount,
        status: pendingPayout.status,
        requestedAt: pendingPayout.requestedAt,
      } : null,
      earningsByType,
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        type: tx.type,
        description: tx.description || '',
        createdAt: tx.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[CREATOR/EARNINGS]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Service temporarily unavailable' : 'Failed to fetch earnings' },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}
