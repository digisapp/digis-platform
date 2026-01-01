import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, streamMessages, walletTransactions, users } from '@/lib/data/system';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30d';

    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1); // Far in the past
        break;
    }

    // Aggregate stream metrics in database (much faster than fetching all rows)
    const [streamMetrics] = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${streams.totalViews}), 0)::int`,
        totalViewers: sql<number>`COALESCE(SUM(${streams.peakViewers}), 0)::int`,
        peakConcurrentViewers: sql<number>`COALESCE(MAX(${streams.peakViewers}), 0)::int`,
        totalDuration: sql<number>`COALESCE(SUM(${streams.durationSeconds}), 0)::int`,
        streamCount: sql<number>`COUNT(*)::int`,
      })
      .from(streams)
      .where(and(
        eq(streams.creatorId, user.id),
        gte(streams.createdAt, startDate)
      ));

    const totalViews = streamMetrics?.totalViews || 0;
    const totalViewers = streamMetrics?.totalViewers || 0;
    const peakConcurrentViewers = streamMetrics?.peakConcurrentViewers || 0;
    const streamCount = streamMetrics?.streamCount || 0;
    const averageViewDuration = streamCount > 0 ? Math.floor((streamMetrics?.totalDuration || 0) / streamCount) : 0;

    // Aggregate earnings in database with breakdown by type (much faster)
    const [earningsAgg] = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.amount} > 0 THEN ${walletTransactions.amount} ELSE 0 END), 0)::int`,
        totalTips: sql<number>`COUNT(CASE WHEN ${walletTransactions.type} IN ('stream_tip', 'dm_tip') AND ${walletTransactions.amount} > 0 THEN 1 END)::int`,
        tips: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} IN ('stream_tip', 'dm_tip') AND ${walletTransactions.amount} > 0 THEN ${walletTransactions.amount} ELSE 0 END), 0)::int`,
        gifts: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'gift' AND ${walletTransactions.amount} > 0 THEN ${walletTransactions.amount} ELSE 0 END), 0)::int`,
        subscriptions: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'subscription_earnings' AND ${walletTransactions.amount} > 0 THEN ${walletTransactions.amount} ELSE 0 END), 0)::int`,
        ppv: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'ppv_unlock' AND ${walletTransactions.amount} > 0 THEN ${walletTransactions.amount} ELSE 0 END), 0)::int`,
      })
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.userId, user.id),
        eq(walletTransactions.status, 'completed'),
        gte(walletTransactions.createdAt, startDate)
      ));

    const totalEarnings = earningsAgg?.totalEarnings || 0;
    const totalTips = earningsAgg?.totalTips || 0;
    const earningsBreakdown = {
      tips: earningsAgg?.tips || 0,
      gifts: earningsAgg?.gifts || 0,
      subscriptions: earningsAgg?.subscriptions || 0,
      ppv: earningsAgg?.ppv || 0,
    };

    // Count messages using a subquery join (no need to fetch stream IDs separately)
    const [messageCountResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(streamMessages)
      .innerJoin(streams, eq(streamMessages.streamId, streams.id))
      .where(and(
        eq(streams.creatorId, user.id),
        gte(streams.createdAt, startDate)
      ));

    const totalMessages = messageCountResult?.count || 0;

    // Calculate engagement rate (messages + tips / total views)
    const engagementRate = totalViews > 0
      ? ((totalMessages + totalTips) / totalViews) * 100
      : 0;

    // Calculate growth rates (compare to previous period)
    // Simplified: just return 0 for now, can be enhanced later
    const revenueGrowth = 0;
    const viewerGrowth = 0;

    // Get top 5 performing streams directly from database (no need to fetch all)
    const topStreamsData = await db
      .select({
        id: streams.id,
        title: streams.title,
        views: streams.totalViews,
        earnings: streams.totalGiftsReceived,
        startedAt: streams.startedAt,
        createdAt: streams.createdAt,
      })
      .from(streams)
      .where(and(
        eq(streams.creatorId, user.id),
        gte(streams.createdAt, startDate)
      ))
      .orderBy(desc(streams.totalGiftsReceived))
      .limit(5);

    const topStreams = topStreamsData.map(stream => ({
      id: stream.id,
      title: stream.title,
      views: stream.views || 0,
      earnings: stream.earnings || 0,
      date: stream.startedAt?.toISOString() || stream.createdAt.toISOString(),
    }));

    // Viewer distribution by hour (simplified - just return empty array for now)
    const viewersByHour: Array<{ hour: number; viewers: number }> = [];

    return NextResponse.json({
      totalViews,
      totalViewers,
      averageViewDuration,
      totalEarnings,
      totalTips,
      totalMessages,
      peakConcurrentViewers,
      engagementRate,
      revenueGrowth,
      viewerGrowth,
      topStreams,
      earningsBreakdown,
      viewersByHour,
    });
  } catch (error) {
    console.error('[analytics/streams] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
