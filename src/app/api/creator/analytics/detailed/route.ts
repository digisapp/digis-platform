import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import {
  users, streams, calls,
  clips, cloudItems, cloudPurchases, fanCreatorSpend,
} from '@/db/schema';
import { eq, and, sql, desc, gte, count } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'creator:analytics');
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
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      dailyEarnings,
      revenueBySource,
      topContent,
      topClips,
      followerGrowth,
      topFans,
      streamStats,
      callStats,
    ] = await Promise.all([
      // 1. Daily earnings chart (group wallet transactions by day)
      db.execute(sql`
        SELECT
          date_trunc('day', created_at)::date AS day,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS earnings
        FROM wallet_transactions
        WHERE user_id = ${user.id}
          AND status = 'completed'
          AND amount > 0
          AND created_at >= ${startDate}
        GROUP BY date_trunc('day', created_at)
        ORDER BY day ASC
      `),

      // 2. Revenue breakdown by source
      db.execute(sql`
        SELECT
          CASE
            WHEN type IN ('stream_tip', 'gift') THEN 'streams'
            WHEN type IN ('call_earnings') THEN 'calls'
            WHEN type IN ('cloud_earnings', 'cloud_pack_earnings', 'cloud_locked_message_earnings') THEN 'cloud'
            WHEN type IN ('subscription_earnings') THEN 'subscriptions'
            WHEN type IN ('dm_tip') THEN 'messages'
            WHEN type IN ('collection_earnings') THEN 'collections'
            WHEN type IN ('booking_earnings') THEN 'bookings'
            ELSE 'other'
          END AS source,
          SUM(amount) AS total
        FROM wallet_transactions
        WHERE user_id = ${user.id}
          AND status = 'completed'
          AND amount > 0
          AND created_at >= ${startDate}
        GROUP BY source
        ORDER BY total DESC
      `),

      // 3. Top performing cloud content (by purchases/earnings)
      db.select({
        id: cloudItems.id,
        type: cloudItems.type,
        thumbnailUrl: cloudItems.thumbnailUrl,
        previewUrl: cloudItems.previewUrl,
        priceCoins: cloudItems.priceCoins,
        likeCount: cloudItems.likeCount,
        purchaseCount: sql<number>`count(${cloudPurchases.id})`,
        totalRevenue: sql<number>`COALESCE(sum(${cloudPurchases.coinsSpent}), 0)`,
      })
        .from(cloudItems)
        .leftJoin(cloudPurchases, eq(cloudPurchases.itemId, cloudItems.id))
        .where(eq(cloudItems.creatorId, user.id))
        .groupBy(cloudItems.id)
        .orderBy(desc(sql`COALESCE(sum(${cloudPurchases.coinsSpent}), 0)`))
        .limit(10),

      // 4. Top performing clips (by views/likes)
      db.select({
        id: clips.id,
        title: clips.title,
        thumbnailUrl: clips.thumbnailUrl,
        viewCount: clips.viewCount,
        likeCount: clips.likeCount,
        shareCount: clips.shareCount,
        createdAt: clips.createdAt,
      })
        .from(clips)
        .where(eq(clips.creatorId, user.id))
        .orderBy(desc(clips.viewCount))
        .limit(10),

      // 5. Follower growth (new followers per day)
      db.execute(sql`
        SELECT
          date_trunc('day', created_at)::date AS day,
          count(*) AS new_followers
        FROM follows
        WHERE following_id = ${user.id}
          AND created_at >= ${startDate}
        GROUP BY date_trunc('day', created_at)
        ORDER BY day ASC
      `),

      // 6. Top fans (by spend on this creator)
      db.select({
        fanId: fanCreatorSpend.fanId,
        totalSpent: fanCreatorSpend.totalSpent,
        tier: fanCreatorSpend.tier,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
        .from(fanCreatorSpend)
        .innerJoin(users, eq(fanCreatorSpend.fanId, users.id))
        .where(eq(fanCreatorSpend.creatorId, user.id))
        .orderBy(desc(fanCreatorSpend.totalSpent))
        .limit(10),

      // 7. Stream performance summary
      db.select({
        totalStreams: count(),
        totalViews: sql<number>`COALESCE(sum(${streams.totalViews}), 0)`,
        avgViewers: sql<number>`COALESCE(avg(${streams.peakViewers}), 0)`,
        totalDuration: sql<number>`COALESCE(sum(EXTRACT(EPOCH FROM (${streams.endedAt} - ${streams.createdAt}))), 0)`,
      })
        .from(streams)
        .where(and(eq(streams.creatorId, user.id), gte(streams.createdAt, startDate))),

      // 8. Call performance summary
      db.select({
        totalCalls: count(),
        totalMinutes: sql<number>`COALESCE(sum(${calls.durationSeconds}) / 60, 0)`,
        totalEarnings: sql<number>`COALESCE(sum(${calls.actualCoins}), 0)`,
        avgRating: sql<number>`0`,
      })
        .from(calls)
        .where(and(
          eq(calls.creatorId, user.id),
          eq(calls.status, 'completed'),
          gte(calls.endedAt, startDate),
        )),
    ]);

    return NextResponse.json({
      period: days,
      dailyEarnings: ((dailyEarnings as any).rows || dailyEarnings).map((r: any) => ({
        day: r.day,
        earnings: Number(r.earnings) || 0,
      })),
      revenueBySource: ((revenueBySource as any).rows || revenueBySource).map((r: any) => ({
        source: r.source,
        total: Number(r.total) || 0,
      })),
      topContent: topContent.map(c => ({
        ...c,
        purchaseCount: Number(c.purchaseCount),
        totalRevenue: Number(c.totalRevenue),
      })),
      topClips,
      followerGrowth: ((followerGrowth as any).rows || followerGrowth).map((r: any) => ({
        day: r.day,
        newFollowers: Number(r.new_followers) || 0,
      })),
      topFans,
      streams: streamStats[0] ? {
        totalStreams: Number(streamStats[0].totalStreams),
        totalViews: Number(streamStats[0].totalViews),
        avgViewers: Math.round(Number(streamStats[0].avgViewers)),
        totalHours: Math.round(Number(streamStats[0].totalDuration) / 3600),
      } : { totalStreams: 0, totalViews: 0, avgViewers: 0, totalHours: 0 },
      calls: callStats[0] ? {
        totalCalls: Number(callStats[0].totalCalls),
        totalMinutes: Math.round(Number(callStats[0].totalMinutes)),
        totalEarnings: Number(callStats[0].totalEarnings),
        avgRating: Number(Number(callStats[0].avgRating).toFixed(1)),
      } : { totalCalls: 0, totalMinutes: 0, totalEarnings: 0, avgRating: 0 },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[Creator Analytics Detailed]', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
