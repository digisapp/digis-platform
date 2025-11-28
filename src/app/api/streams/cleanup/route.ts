import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { streams } from '@/db/schema';
import { eq, and, lt, isNull, or } from 'drizzle-orm';

/**
 * Cleanup stale live streams that haven't received a heartbeat in 2 minutes
 * This endpoint can be called via cron job or Edge function
 *
 * Also called from the streams listing API to ensure fresh data
 */
export async function POST(request: NextRequest) {
  try {
    // Check for optional auth header for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require it for external calls
    // Internal calls (from other API routes) won't have the header
    if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // End streams that:
    // 1. Are still "live"
    // 2. Have a lastHeartbeat older than 2 minutes OR no heartbeat at all (null)
    const staleStreams = await db.update(streams)
      .set({
        status: 'ended',
        endedAt: new Date(),
      })
      .where(
        and(
          eq(streams.status, 'live'),
          or(
            lt(streams.lastHeartbeat, twoMinutesAgo),
            isNull(streams.lastHeartbeat)
          )
        )
      )
      .returning({ id: streams.id, title: streams.title });

    if (staleStreams.length > 0) {
      console.log(`Cleaned up ${staleStreams.length} stale streams:`, staleStreams.map(s => s.title));
    }

    return NextResponse.json({
      success: true,
      cleanedUp: staleStreams.length,
      streams: staleStreams,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
