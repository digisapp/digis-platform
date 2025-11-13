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

    // Fetch creator's streams in date range
    const creatorStreams = await db.query.streams.findMany({
      where: and(
        eq(streams.creatorId, user.id),
        gte(streams.createdAt, startDate)
      ),
      orderBy: [desc(streams.startedAt)],
    });

    // Calculate basic metrics
    const totalViews = creatorStreams.reduce((sum, s) => sum + (s.totalViews || 0), 0);
    const totalViewers = creatorStreams.reduce((sum, s) => sum + (s.peakViewers || 0), 0);
    const peakConcurrentViewers = Math.max(...creatorStreams.map(s => s.peakViewers || 0), 0);

    // Calculate average view duration (simplified)
    const totalDuration = creatorStreams.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const averageViewDuration = creatorStreams.length > 0 ? Math.floor(totalDuration / creatorStreams.length) : 0;

    // Fetch earnings from wallet transactions
    const earningsTransactions = await db.query.walletTransactions.findMany({
      where: and(
        eq(walletTransactions.userId, user.id),
        eq(walletTransactions.status, 'completed'),
        gte(walletTransactions.createdAt, startDate)
      ),
    });

    // Calculate earnings breakdown
    const earningsBreakdown = {
      tips: 0,
      gifts: 0,
      subscriptions: 0,
      ppv: 0,
    };

    let totalEarnings = 0;
    let totalTips = 0;

    earningsTransactions.forEach(tx => {
      if (tx.amount > 0) {
        totalEarnings += tx.amount;

        switch (tx.type) {
          case 'stream_tip':
          case 'dm_tip':
            earningsBreakdown.tips += tx.amount;
            totalTips++;
            break;
          case 'gift':
            earningsBreakdown.gifts += tx.amount;
            break;
          case 'subscription_earnings':
            earningsBreakdown.subscriptions += tx.amount;
            break;
          case 'ppv_unlock':
            earningsBreakdown.ppv += tx.amount;
            break;
        }
      }
    });

    // Count chat messages
    const streamIds = creatorStreams.map(s => s.id);
    let totalMessages = 0;

    if (streamIds.length > 0) {
      // Count messages across all streams
      const messageCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(streamMessages)
        .where(sql`${streamMessages.streamId} = ANY(${streamIds})`);

      totalMessages = Number(messageCount[0]?.count || 0);
    }

    // Calculate engagement rate (messages + tips / total views)
    const engagementRate = totalViews > 0
      ? ((totalMessages + totalTips) / totalViews) * 100
      : 0;

    // Calculate growth rates (compare to previous period)
    // Simplified: just return 0 for now, can be enhanced later
    const revenueGrowth = 0;
    const viewerGrowth = 0;

    // Get top performing streams
    const topStreams = creatorStreams
      .sort((a, b) => (b.totalGiftsReceived || 0) - (a.totalGiftsReceived || 0))
      .slice(0, 5)
      .map(stream => ({
        id: stream.id,
        title: stream.title,
        views: stream.totalViews || 0,
        earnings: stream.totalGiftsReceived || 0,
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
