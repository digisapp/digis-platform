import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, streams } from '@/lib/data/system';
import { eq, and, count } from 'drizzle-orm';

// Thresholds for showing discovery features
const MIN_CREATORS_FOR_EXPLORE = 10;
const MIN_LIVE_STREAMS_FOR_STREAMS_TAB = 1;

// Cache the result for 60 seconds to avoid hammering the DB
let cachedResult: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * GET /api/content/availability
 *
 * Returns whether to show Explore and Streams tabs based on content availability.
 * This is used to hide empty pages on a new platform.
 *
 * Response:
 * - showExplore: boolean - Show if >= 10 creators
 * - showStreams: boolean - Show if >= 1 live stream
 * - creatorsCount: number
 * - liveStreamsCount: number
 */
export async function GET() {
  try {
    // Return cached result if still valid
    const now = Date.now();
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json(cachedResult.data);
    }

    // Fetch counts in parallel
    const [creatorsResult, liveStreamsResult] = await Promise.all([
      // Count verified creators
      db.select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role, 'creator'),
            eq(users.isCreatorVerified, true)
          )
        ),
      // Count currently live streams
      db.select({ count: count() })
        .from(streams)
        .where(eq(streams.status, 'live'))
    ]);

    const creatorsCount = creatorsResult[0]?.count || 0;
    const liveStreamsCount = liveStreamsResult[0]?.count || 0;

    const data = {
      showExplore: creatorsCount >= MIN_CREATORS_FOR_EXPLORE,
      showStreams: liveStreamsCount >= MIN_LIVE_STREAMS_FOR_STREAMS_TAB,
      creatorsCount,
      liveStreamsCount,
    };

    // Cache the result
    cachedResult = { data, timestamp: now };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking content availability:', error);
    // On error, show everything (fail open for better UX)
    return NextResponse.json({
      showExplore: true,
      showStreams: true,
      creatorsCount: 0,
      liveStreamsCount: 0,
    });
  }
}
