import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { streams, shows, vods, users } from '@/lib/data/system';
import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';
import { getCachedApiResponse } from '@/lib/cache/hot-data-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/watch - Combined endpoint for the watch page
 * Returns live streams, upcoming shows, and recent VODs
 */
export async function GET() {
  const requestId = nanoid(10);

  try {
    // Cache watch page data for 15 seconds to reduce DB load on high-traffic page
    const data = await getCachedApiResponse('watch', async () => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [liveStreams, liveShows, upcomingShows, recentVods] = await Promise.all([
      // Free live streams
      withTimeoutAndRetry(
        () => db
          .select({
            id: streams.id,
            title: streams.title,
            description: streams.description,
            thumbnailUrl: streams.thumbnailUrl,
            currentViewers: streams.currentViewers,
            category: streams.category,
            tags: streams.tags,
            startedAt: streams.startedAt,
            creator: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
            },
          })
          .from(streams)
          .innerJoin(users, eq(streams.creatorId, users.id))
          .where(eq(streams.status, 'live'))
          .orderBy(desc(streams.currentViewers))
          .limit(50),
        { timeoutMs: 5000, retries: 1, tag: 'watchLiveStreams' }
      ),

      // Paid live shows
      withTimeoutAndRetry(
        () => db
          .select({
            id: shows.id,
            title: shows.title,
            description: shows.description,
            showType: shows.showType,
            ticketPrice: shows.ticketPrice,
            ticketsSold: shows.ticketsSold,
            maxTickets: shows.maxTickets,
            coverImageUrl: shows.coverImageUrl,
            tags: shows.tags,
            actualStart: shows.actualStart,
            creator: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
            },
          })
          .from(shows)
          .innerJoin(users, eq(shows.creatorId, users.id))
          .where(eq(shows.status, 'live'))
          .orderBy(desc(shows.ticketsSold))
          .limit(20),
        { timeoutMs: 5000, retries: 1, tag: 'watchLiveShows' }
      ),

      // Upcoming scheduled shows (next 7 days)
      withTimeoutAndRetry(
        () => db
          .select({
            id: shows.id,
            title: shows.title,
            description: shows.description,
            showType: shows.showType,
            ticketPrice: shows.ticketPrice,
            ticketsSold: shows.ticketsSold,
            maxTickets: shows.maxTickets,
            scheduledStart: shows.scheduledStart,
            durationMinutes: shows.durationMinutes,
            coverImageUrl: shows.coverImageUrl,
            tags: shows.tags,
            creator: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
            },
          })
          .from(shows)
          .innerJoin(users, eq(shows.creatorId, users.id))
          .where(
            and(
              eq(shows.status, 'scheduled'),
              gte(shows.scheduledStart, now),
              lte(shows.scheduledStart, sevenDaysFromNow)
            )
          )
          .orderBy(shows.scheduledStart)
          .limit(30),
        { timeoutMs: 5000, retries: 1, tag: 'watchUpcomingShows' }
      ),

      // Recent public VODs for discovery
      withTimeoutAndRetry(
        () => db
          .select({
            id: vods.id,
            title: vods.title,
            description: vods.description,
            thumbnailUrl: vods.thumbnailUrl,
            duration: vods.duration,
            isPublic: vods.isPublic,
            priceCoins: vods.priceCoins,
            viewCount: vods.viewCount,
            createdAt: vods.createdAt,
            creator: {
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
            },
          })
          .from(vods)
          .innerJoin(users, eq(vods.creatorId, users.id))
          .where(
            and(
              eq(vods.isDraft, false),
              // Show public VODs or reasonably priced ones for discovery
              or(eq(vods.isPublic, true), sql`${vods.priceCoins} <= 100`)
            )
          )
          .orderBy(desc(vods.createdAt))
          .limit(20),
        { timeoutMs: 5000, retries: 1, tag: 'watchRecentVods' }
      ),
    ]);

    // Combine free streams and paid shows into a single live array
    const allLive = [
      ...liveStreams.map(stream => ({
        ...stream,
        type: 'free' as const,
        isFree: true,
      })),
      ...liveShows.map(show => ({
        ...show,
        type: 'paid' as const,
        isFree: false,
      })),
    ];

    return {
      liveStreams: allLive,
      upcomingShows,
      recentVods,
      counts: {
        live: allLive.length,
        upcoming: upcomingShows.length,
        vods: recentVods.length,
      },
    };
    }, 15); // 15 second TTL

    return NextResponse.json({
      success: true,
      ...data,
    }, {
      headers: {
        'x-request-id': requestId,
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    console.error('[WATCH_API]', { requestId, error: error?.message });

    // Return partial data on error
    return NextResponse.json({
      success: false,
      liveStreams: [],
      upcomingShows: [],
      recentVods: [],
      counts: { live: 0, upcoming: 0, vods: 0 },
      _error: 'temporarily_unavailable',
    }, {
      status: 200,
      headers: { 'x-request-id': requestId },
    });
  }
}
