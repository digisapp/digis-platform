import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { socialShareSubmissions } from '@/db/schema/rewards';
import { users } from '@/db/schema/users';
import { eq, desc, sql } from 'drizzle-orm';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/share-rewards - Get all submissions for admin review
export const GET = withAdmin(async ({ request }) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    // Get submissions with creator info
    const submissions = await db
      .select({
        id: socialShareSubmissions.id,
        platform: socialShareSubmissions.platform,
        screenshotUrl: socialShareSubmissions.screenshotUrl,
        socialHandle: socialShareSubmissions.socialHandle,
        status: socialShareSubmissions.status,
        coinsAwarded: socialShareSubmissions.coinsAwarded,
        rejectionReason: socialShareSubmissions.rejectionReason,
        createdAt: socialShareSubmissions.createdAt,
        reviewedAt: socialShareSubmissions.reviewedAt,
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          email: users.email,
        },
      })
      .from(socialShareSubmissions)
      .leftJoin(users, eq(socialShareSubmissions.creatorId, users.id))
      .where(status !== 'all' ? eq(socialShareSubmissions.status, status as any) : sql`1=1`)
      .orderBy(desc(socialShareSubmissions.createdAt));

    // Get stats with a single DB query instead of loading all rows
    const statsResult = await db
      .select({
        status: socialShareSubmissions.status,
        count: sql<number>`count(*)::int`,
        totalCoins: sql<number>`COALESCE(SUM(${socialShareSubmissions.coinsAwarded}), 0)::int`,
      })
      .from(socialShareSubmissions)
      .groupBy(socialShareSubmissions.status);

    const statsMap = statsResult.reduce((acc, s) => {
      acc[s.status] = { count: s.count, totalCoins: s.totalCoins };
      return acc;
    }, {} as Record<string, { count: number; totalCoins: number }>);

    return NextResponse.json({
      submissions,
      stats: {
        pending: statsMap.pending?.count || 0,
        approved: statsMap.approved?.count || 0,
        rejected: statsMap.rejected?.count || 0,
        totalCoinsAwarded: statsMap.approved?.totalCoins || 0,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN SHARE REWARDS] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
});
