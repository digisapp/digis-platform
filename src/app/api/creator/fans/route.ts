import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, fanCreatorSpend, follows } from '@/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tier thresholds in coins
const TIER_THRESHOLDS = {
  bronze: 100,
  silver: 500,
  gold: 2000,
  platinum: 10000,
  diamond: 50000,
};

/**
 * GET /api/creator/fans
 * Returns fan loyalty data for the authenticated creator
 *
 * Query params:
 * - tier: filter by tier (optional)
 * - sort: 'spend' | 'recent' (default 'spend')
 * - limit: number (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'creator:fans');
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Creator only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tierFilter = searchParams.get('tier');
    const sort = searchParams.get('sort') || 'spend';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Build where clause
    let whereClause = eq(fanCreatorSpend.creatorId, user.id);
    if (tierFilter && tierFilter !== 'all') {
      whereClause = and(whereClause, eq(fanCreatorSpend.tier, tierFilter)) as any;
    }

    // Get fans with their spend data
    const fans = await db
      .select({
        fanId: fanCreatorSpend.fanId,
        totalSpent: fanCreatorSpend.totalSpent,
        tier: fanCreatorSpend.tier,
        lastTransactionAt: fanCreatorSpend.lastTransactionAt,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(fanCreatorSpend)
      .innerJoin(users, eq(fanCreatorSpend.fanId, users.id))
      .where(whereClause)
      .orderBy(
        sort === 'recent'
          ? desc(fanCreatorSpend.lastTransactionAt)
          : desc(fanCreatorSpend.totalSpent)
      )
      .limit(limit);

    // Get tier distribution
    const tierCounts = await db
      .select({
        tier: fanCreatorSpend.tier,
        count: count(),
        totalSpent: sql<number>`sum(${fanCreatorSpend.totalSpent})`,
      })
      .from(fanCreatorSpend)
      .where(eq(fanCreatorSpend.creatorId, user.id))
      .groupBy(fanCreatorSpend.tier);

    // Get follower count for context
    const followerCountResult = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    return NextResponse.json({
      fans: fans.map(f => ({
        ...f,
        lastTransactionAt: f.lastTransactionAt?.toISOString() || null,
      })),
      tierDistribution: tierCounts.reduce((acc, t) => {
        acc[t.tier] = { count: Number(t.count), totalSpent: Number(t.totalSpent) };
        return acc;
      }, {} as Record<string, { count: number; totalSpent: number }>),
      totalFollowers: Number(followerCountResult[0]?.count || 0),
      thresholds: TIER_THRESHOLDS,
    });
  } catch (error) {
    console.error('[Creator Fans]', error);
    return NextResponse.json({ error: 'Failed to fetch fans' }, { status: 500 });
  }
}
