import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/db/schema/users';
import { referrals } from '@/db/schema/referrals';
import { eq } from 'drizzle-orm';
import { getReferralStats, getReferralList } from '@/lib/referrals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/creator/referrals - Get creator's referral stats and list
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { id: true, username: true, role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
    }

    // Get stats
    const stats = await getReferralStats(user.id);

    // Get referral list with referred user details
    const referralList = await getReferralList(user.id);

    // Format the list for the frontend
    const formattedList = referralList.map(r => ({
      id: r.id,
      status: r.status,
      signupBonusPaid: r.signupBonusPaid,
      signupBonusAmount: r.signupBonusAmount,
      totalCommissionEarned: r.totalCommissionEarned,
      pendingCommission: r.pendingCommission,
      revenueShareExpiresAt: r.revenueShareExpiresAt,
      createdAt: r.createdAt,
      activatedAt: r.activatedAt,
      referred: r.referred ? {
        id: r.referred.id,
        username: r.referred.username,
        displayName: r.referred.displayName,
        avatarUrl: r.referred.avatarUrl,
      } : null,
    }));

    return NextResponse.json({
      stats,
      referrals: formattedList,
      referralLink: `https://digis.cc/join/${dbUser.username}`,
      referralCode: dbUser.username,
    });
  } catch (error: any) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}
