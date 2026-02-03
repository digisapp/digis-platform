import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, streams, streamGifts, calls, walletTransactions } from '@/lib/data/system';
import { eq, and, sql, desc, gte, lt } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper to get date range for period
function getDateRange(period: string): { startDate: Date | null; endDate: Date; previousStartDate: Date | null; previousEndDate: Date | null } {
  const now = new Date();
  const endDate = now;

  if (period === 'all' || !period) {
    return { startDate: null, endDate, previousStartDate: null, previousEndDate: null };
  }

  const days = parseInt(period, 10);
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const previousEndDate = new Date(startDate.getTime());
  const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

  return { startDate, endDate, previousStartDate, previousEndDate };
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    console.log('[CREATOR_ANALYTICS]', {
      requestId,
      userId: user.id
    });

    // Verify user is a creator with timeout
    let dbUser;
    try {
      dbUser = await withTimeoutAndRetry(
        () => db.query.users.findFirst({
          where: eq(users.id, user.id),
        }),
        {
          timeoutMs: 3000,
          retries: 1,
          tag: 'getUserRole'
        }
      );
    } catch (error) {
      console.error('[CREATOR_ANALYTICS]', {
        requestId,
        error: 'Failed to verify user role',
        userId: user.id
      });

      // Return degraded analytics instead of 503
      const emptyAnalytics = {
        overview: {
          totalEarnings: 0,
          totalGiftCoins: 0,
          totalCallEarnings: 0,
          totalStreams: 0,
          totalCalls: 0,
          totalStreamViews: 0,
          peakViewers: 0,
        },
        streams: {
          totalStreams: 0,
          totalViews: 0,
          peakViewers: 0,
          averageViewers: 0,
        },
        calls: {
          totalCalls: 0,
          totalMinutes: 0,
          totalEarnings: 0,
          averageCallLength: 0,
        },
        gifts: {
          totalGifts: 0,
          totalCoins: 0,
          averageGiftValue: 0,
        },
        topGifters: [],
        recentActivity: [],
      };

      return NextResponse.json(
        degraded(
          emptyAnalytics,
          'Analytics temporarily unavailable - please try again in a moment',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json(
        failure('Only creators can access analytics', 'auth', requestId),
        { status: 403, headers: { 'x-request-id': requestId } }
      );
    }

    // Get period from query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange(period);

    // Fetch all analytics data with timeout and retry
    // OPTIMIZED: Run all queries in parallel instead of sequential
    try {
      const analyticsData = await withTimeoutAndRetry(
        async () => {
          // Build date filter conditions
          const streamDateFilter = startDate
            ? and(eq(streams.creatorId, user.id), gte(streams.createdAt, startDate))
            : eq(streams.creatorId, user.id);

          const callDateFilter = startDate
            ? and(eq(calls.creatorId, user.id), eq(calls.status, 'completed'), gte(calls.endedAt, startDate))
            : and(eq(calls.creatorId, user.id), eq(calls.status, 'completed'));

          const giftDateFilter = startDate
            ? and(eq(streams.creatorId, user.id), gte(streamGifts.createdAt, startDate))
            : eq(streams.creatorId, user.id);

          // Previous period filters for comparison
          const prevStreamDateFilter = previousStartDate && previousEndDate
            ? and(eq(streams.creatorId, user.id), gte(streams.createdAt, previousStartDate), lt(streams.createdAt, previousEndDate))
            : null;

          const prevCallDateFilter = previousStartDate && previousEndDate
            ? and(eq(calls.creatorId, user.id), eq(calls.status, 'completed'), gte(calls.endedAt, previousStartDate), lt(calls.endedAt, previousEndDate))
            : null;

          const prevGiftDateFilter = previousStartDate && previousEndDate
            ? and(eq(streams.creatorId, user.id), gte(streamGifts.createdAt, previousStartDate), lt(streamGifts.createdAt, previousEndDate))
            : null;

          // Run ALL queries in parallel for 5x faster loading
          const [
            creatorStreams,
            giftsReceived,
            completedCalls,
            topGifters,
            recentTransactions,
            // Previous period data for comparison
            prevGiftsReceived,
            prevCompletedCalls,
          ] = await Promise.all([
            // Query 1: Get stream analytics (current period)
            db.query.streams.findMany({
              where: streamDateFilter,
              orderBy: [desc(streams.createdAt)],
            }),

            // Query 2: Get gift earnings (current period)
            db
              .select({
                totalCoins: sql<number>`sum(${streamGifts.totalCoins})`,
                giftCount: sql<number>`count(*)`,
              })
              .from(streamGifts)
              .innerJoin(streams, eq(streamGifts.streamId, streams.id))
              .where(giftDateFilter)
              .groupBy(streams.creatorId),

            // Query 3: Get completed calls (current period)
            db.query.calls.findMany({
              where: callDateFilter,
            }),

            // Query 4: Get top gifters (current period)
            db
              .select({
                userId: streamGifts.senderId,
                totalCoins: sql<number>`sum(${streamGifts.totalCoins})`,
                giftCount: sql<number>`count(*)`,
                username: users.username,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
              })
              .from(streamGifts)
              .innerJoin(streams, eq(streamGifts.streamId, streams.id))
              .innerJoin(users, eq(streamGifts.senderId, users.id))
              .where(giftDateFilter)
              .groupBy(streamGifts.senderId, users.username, users.displayName, users.avatarUrl)
              .orderBy(desc(sql`sum(${streamGifts.totalCoins})`))
              .limit(5),

            // Query 5: Get recent transactions
            db.query.walletTransactions.findMany({
              where: and(
                eq(walletTransactions.userId, user.id),
                eq(walletTransactions.status, 'completed')
              ),
              orderBy: [desc(walletTransactions.createdAt)],
              limit: 10,
            }),

            // Query 6: Previous period gift earnings (for comparison)
            prevGiftDateFilter
              ? db
                  .select({
                    totalCoins: sql<number>`sum(${streamGifts.totalCoins})`,
                  })
                  .from(streamGifts)
                  .innerJoin(streams, eq(streamGifts.streamId, streams.id))
                  .where(prevGiftDateFilter)
                  .groupBy(streams.creatorId)
              : Promise.resolve([]),

            // Query 7: Previous period calls (for comparison)
            prevCallDateFilter
              ? db.query.calls.findMany({ where: prevCallDateFilter })
              : Promise.resolve([]),
          ]);

          // Process stream data - use totalViews (historical) not currentViewers (live count)
          const totalStreamViews = creatorStreams.reduce((sum, stream) => sum + (stream.totalViews || 0), 0);
          const peakViewers = Math.max(...creatorStreams.map(s => s.peakViewers || 0), 0);
          const totalStreams = creatorStreams.length;

          // Process gift data
          const totalGiftCoins = giftsReceived[0]?.totalCoins || 0;
          const totalGifts = giftsReceived[0]?.giftCount || 0;

          // Process call data
          const totalCallMinutes = completedCalls.reduce((sum, call) => {
            return sum + (call.durationSeconds ? Math.ceil(call.durationSeconds / 60) : 0);
          }, 0);
          const totalCallEarnings = completedCalls.reduce((sum, call) => {
            return sum + (call.actualCoins || 0);
          }, 0);
          const totalCalls = completedCalls.length;

          // Calculate total earnings
          const totalEarnings = totalGiftCoins + totalCallEarnings;

          // Calculate previous period earnings for comparison
          const prevGiftCoins = prevGiftsReceived[0]?.totalCoins || 0;
          const prevCallEarnings = prevCompletedCalls.reduce((sum, call) => {
            return sum + (call.actualCoins || 0);
          }, 0);
          const previousPeriodEarnings = prevGiftCoins + prevCallEarnings;

          return {
            overview: {
              totalEarnings,
              totalGiftCoins,
              totalCallEarnings,
              totalStreams,
              totalCalls,
              totalStreamViews,
              peakViewers,
            },
            streams: {
              totalStreams,
              totalViews: totalStreamViews,
              peakViewers,
              averageViewers: totalStreams > 0 ? Math.round(totalStreamViews / totalStreams) : 0,
            },
            calls: {
              totalCalls,
              totalMinutes: totalCallMinutes,
              totalEarnings: totalCallEarnings,
              averageCallLength: totalCalls > 0 ? Math.round(totalCallMinutes / totalCalls) : 0,
            },
            gifts: {
              totalGifts,
              totalCoins: totalGiftCoins,
              averageGiftValue: totalGifts > 0 ? Math.round(totalGiftCoins / totalGifts) : 0,
            },
            topGifters: topGifters.map(g => ({
              userId: g.userId,
              username: g.username,
              displayName: g.displayName,
              avatarUrl: g.avatarUrl,
              totalCoins: Number(g.totalCoins),
              giftCount: Number(g.giftCount),
            })),
            recentActivity: recentTransactions.map(tx => ({
              id: tx.id,
              type: tx.type,
              amount: tx.amount,
              description: tx.description,
              createdAt: tx.createdAt,
            })),
            // Add previous period for comparison
            previousPeriodEarnings: period !== 'all' ? previousPeriodEarnings : undefined,
            period,
          };
        },
        {
          timeoutMs: 5000,  // Reduced from 10s - parallel queries should complete faster
          retries: 1,       // Reduced from 2 - faster failure
          tag: 'fetchAnalytics'
        }
      );

      return NextResponse.json(
        success(analyticsData, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[CREATOR_ANALYTICS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id
      });

      // Return degraded response with zero values
      const emptyAnalytics = {
        overview: {
          totalEarnings: 0,
          totalGiftCoins: 0,
          totalCallEarnings: 0,
          totalStreams: 0,
          totalCalls: 0,
          totalStreamViews: 0,
          peakViewers: 0,
        },
        streams: {
          totalStreams: 0,
          totalViews: 0,
          peakViewers: 0,
          averageViewers: 0,
        },
        calls: {
          totalCalls: 0,
          totalMinutes: 0,
          totalEarnings: 0,
          averageCallLength: 0,
        },
        gifts: {
          totalGifts: 0,
          totalCoins: 0,
          averageGiftValue: 0,
        },
        topGifters: [],
        recentActivity: [],
      };

      return NextResponse.json(
        degraded(
          emptyAnalytics,
          'Analytics temporarily unavailable - please try again in a moment',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[CREATOR_ANALYTICS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const emptyAnalytics = {
      overview: {
        totalEarnings: 0,
        totalGiftCoins: 0,
        totalCallEarnings: 0,
        totalStreams: 0,
        totalCalls: 0,
        totalStreamViews: 0,
        peakViewers: 0,
      },
      streams: {
        totalStreams: 0,
        totalViews: 0,
        peakViewers: 0,
        averageViewers: 0,
      },
      calls: {
        totalCalls: 0,
        totalMinutes: 0,
        totalEarnings: 0,
        averageCallLength: 0,
      },
      gifts: {
        totalGifts: 0,
        totalCoins: 0,
        averageGiftValue: 0,
      },
      topGifters: [],
      recentActivity: [],
    };

    return NextResponse.json(
      degraded(
        emptyAnalytics,
        'Failed to fetch analytics - please try again',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
