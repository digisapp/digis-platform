import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { referrals, referralCommissions } from '@/db/schema/referrals';
import { users } from '@/db/schema/users';
import { eq, desc, sql } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/referrals - Get all referrals for admin view
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all referrals with referrer and referred user info
    const allReferrals = await db
      .select({
        id: referrals.id,
        status: referrals.status,
        referralCode: referrals.referralCode,
        signupBonusPaid: referrals.signupBonusPaid,
        signupBonusAmount: referrals.signupBonusAmount,
        revenueSharePercent: referrals.revenueSharePercent,
        revenueShareExpiresAt: referrals.revenueShareExpiresAt,
        totalCommissionEarned: referrals.totalCommissionEarned,
        pendingCommission: referrals.pendingCommission,
        createdAt: referrals.createdAt,
        activatedAt: referrals.activatedAt,
        referrerId: referrals.referrerId,
        referredId: referrals.referredId,
      })
      .from(referrals)
      .orderBy(desc(referrals.createdAt));

    // Get user details for referrers and referred users
    const userIds = new Set<string>();
    allReferrals.forEach(r => {
      if (r.referrerId) userIds.add(r.referrerId);
      if (r.referredId) userIds.add(r.referredId);
    });

    const userDetails = await db.query.users.findMany({
      where: sql`${users.id} = ANY(ARRAY[${sql.raw([...userIds].map(id => `'${id}'`).join(','))}]::uuid[])`,
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        email: true,
      },
    });

    const userMap = new Map(userDetails.map(u => [u.id, u]));

    // Format referrals with user details
    const formattedReferrals = allReferrals.map(r => ({
      ...r,
      referrer: userMap.get(r.referrerId) || null,
      referred: r.referredId ? userMap.get(r.referredId) || null : null,
    }));

    // Calculate stats
    const stats = {
      totalReferrals: allReferrals.length,
      activeReferrals: allReferrals.filter(r => r.status === 'active').length,
      pendingReferrals: allReferrals.filter(r => r.status === 'pending').length,
      expiredReferrals: allReferrals.filter(r => r.status === 'expired').length,
      totalBonusesPaid: allReferrals.filter(r => r.signupBonusPaid).reduce((sum, r) => sum + (r.signupBonusAmount || 0), 0),
      totalCommissionsPaid: allReferrals.reduce((sum, r) => sum + (r.totalCommissionEarned || 0), 0),
      totalPendingCommissions: allReferrals.reduce((sum, r) => sum + (r.pendingCommission || 0), 0),
    };

    return NextResponse.json({
      referrals: formattedReferrals,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}
