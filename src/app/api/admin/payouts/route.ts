import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests, creatorBankingInfo, users } from '@/lib/data/system';
import { eq, desc } from 'drizzle-orm';
import { getLastFourDigits } from '@/lib/crypto/encryption';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/payouts - Get all payout requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profileResponse = await fetch(new URL('/api/user/profile', request.url), {
      headers: { cookie: request.headers.get('cookie') || '' }
    });
    const profile = await profileResponse.json();

    if (profile.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';

    // Fetch payout requests with creator info
    let payoutsQuery = db
      .select({
        payout: payoutRequests,
        creator: users,
        banking: creatorBankingInfo,
      })
      .from(payoutRequests)
      .leftJoin(users, eq(payoutRequests.creatorId, users.id))
      .leftJoin(creatorBankingInfo, eq(payoutRequests.bankingInfoId, creatorBankingInfo.id))
      .orderBy(desc(payoutRequests.requestedAt))
      .$dynamic();

    if (filter === 'pending') {
      payoutsQuery = payoutsQuery.where(eq(payoutRequests.status, 'pending'));
    }

    const results = await payoutsQuery;

    const payouts = results.map((row) => ({
      id: row.payout.id,
      creatorId: row.payout.creatorId,
      creatorUsername: row.creator?.username || 'Unknown',
      creatorDisplayName: row.creator?.displayName || row.creator?.username || 'Unknown',
      amount: row.payout.amount,
      status: row.payout.status,
      bankingInfo: row.banking ? {
        accountHolderName: row.banking.accountHolderName,
        bankName: row.banking.bankName,
        accountType: row.banking.accountType,
        lastFourDigits: getLastFourDigits(row.banking.accountNumber),
        isVerified: row.banking.isVerified === 1,
      } : null,
      requestedAt: row.payout.requestedAt,
      processedAt: row.payout.processedAt,
      completedAt: row.payout.completedAt,
      failureReason: row.payout.failureReason,
      adminNotes: row.payout.adminNotes,
    }));

    return NextResponse.json({ payouts });
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
