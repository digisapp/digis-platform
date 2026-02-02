import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { referrals } from '@/db/schema/referrals';
import { users } from '@/db/schema/users';
import { desc, inArray } from 'drizzle-orm';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/referrals - Get all referrals for admin view
export const GET = withAdmin(async () => {
  try {
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

    // Use Drizzle's inArray for safe parameterized query (no raw SQL string assembly)
    const userDetails = userIds.size > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, [...userIds]),
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        })
      : [];

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
  } catch (error: unknown) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
});
