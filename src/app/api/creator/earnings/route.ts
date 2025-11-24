import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, wallets, walletTransactions, payoutRequests } from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/creator/earnings - Get creator's earnings data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is creator
    const profileResponse = await fetch(new URL('/api/user/profile', request.url), {
      headers: { cookie: request.headers.get('cookie') || '' }
    });
    const profile = await profileResponse.json();

    if (profile.user?.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can access earnings' }, { status: 403 });
    }

    // Get wallet balance
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    const balance = wallet?.balance || 0;
    const heldBalance = wallet?.heldBalance || 0;
    const availableBalance = balance - heldBalance;

    // Get earnings breakdown by type
    const earningTransactions = await db.query.walletTransactions.findMany({
      where: and(
        eq(walletTransactions.userId, user.id),
        eq(walletTransactions.status, 'completed')
      ),
    });

    // Calculate earnings by type
    const earningsByType = {
      call_earnings: 0,
      message_earnings: 0,
      stream_tip: 0,
      subscription_earnings: 0,
    };

    let totalEarnings = 0;

    earningTransactions.forEach((tx) => {
      if (tx.amount > 0) {
        totalEarnings += tx.amount;

        if (tx.type === 'call_earnings') {
          earningsByType.call_earnings += tx.amount;
        } else if (tx.type === 'message_earnings') {
          earningsByType.message_earnings += tx.amount;
        } else if (tx.type === 'stream_tip') {
          earningsByType.stream_tip += tx.amount;
        } else if (tx.type === 'subscription_earnings') {
          earningsByType.subscription_earnings += tx.amount;
        }
      }
    });

    // Get pending payout
    const pendingPayout = await db.query.payoutRequests.findFirst({
      where: and(
        eq(payoutRequests.creatorId, user.id),
        eq(payoutRequests.status, 'pending')
      ),
      orderBy: [desc(payoutRequests.requestedAt)],
    });

    // Get recent transactions (last 50)
    const recentTransactions = await db.query.walletTransactions.findMany({
      where: and(
        eq(walletTransactions.userId, user.id),
        eq(walletTransactions.status, 'completed')
      ),
      orderBy: [desc(walletTransactions.createdAt)],
      limit: 50,
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
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch earnings' },
      { status: 500 }
    );
  }
}
