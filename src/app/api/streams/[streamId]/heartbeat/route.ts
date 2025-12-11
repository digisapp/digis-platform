import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { streams } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { publishToChannel } from '@/lib/ably/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Grace periods in milliseconds
const BRB_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes - show BRB overlay
const AUTO_END_FREE_MS = 5 * 60 * 1000; // 5 minutes - auto-end free streams
const AUTO_END_TICKETED_MS = 10 * 60 * 1000; // 10 minutes - auto-end ticketed shows

/**
 * POST /api/streams/[streamId]/heartbeat
 * Broadcaster heartbeat - updates lastHeartbeat timestamp
 * If no heartbeat received, viewers see BRB message
 * After grace period, stream is auto-ended
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ streamId: string }> }
) {
  try {
    const params = await context.params;
    const { streamId } = params;

    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current stream state first
    const stream = await db.query.streams.findFirst({
      where: and(
        eq(streams.id, streamId),
        eq(streams.creatorId, user.id)
      ),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.status !== 'live') {
      return NextResponse.json({ error: 'Stream is not live' }, { status: 400 });
    }

    const now = new Date();
    const previousHeartbeat = stream.lastHeartbeat;

    // Update heartbeat timestamp
    await db.update(streams)
      .set({ lastHeartbeat: now })
      .where(eq(streams.id, streamId));

    // Check if this is a reconnection after being away
    if (previousHeartbeat) {
      const timeSinceLastHeartbeat = now.getTime() - previousHeartbeat.getTime();

      if (timeSinceLastHeartbeat > BRB_THRESHOLD_MS) {
        // Creator was away (BRB was showing), now back - broadcast reconnection
        console.log(`[Heartbeat] Creator reconnected to stream ${streamId} after ${Math.round(timeSinceLastHeartbeat / 1000)}s`);

        try {
          await publishToChannel(`stream:${streamId}`, 'creator_reconnected', {
            streamId,
            timestamp: now.toISOString(),
            wasAwaySeconds: Math.round(timeSinceLastHeartbeat / 1000),
          });
        } catch (e) {
          console.error('[Heartbeat] Failed to publish reconnect event:', e);
        }
      }
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString() });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/streams/[streamId]/heartbeat
 * Check stream health status - viewers poll this to know if BRB should show
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ streamId: string }> }
) {
  try {
    const params = await context.params;
    const { streamId } = params;

    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: {
        id: true,
        status: true,
        lastHeartbeat: true,
        ticketPrice: true,
      },
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.status !== 'live') {
      return NextResponse.json({
        status: stream.status,
        isHealthy: false,
        isBRB: false,
      });
    }

    const now = new Date();
    const lastHeartbeat = stream.lastHeartbeat;

    // No heartbeat yet means stream just started
    if (!lastHeartbeat) {
      return NextResponse.json({
        status: 'live',
        isHealthy: true,
        isBRB: false,
        secondsSinceHeartbeat: 0,
      });
    }

    const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
    const isTicketed = stream.ticketPrice && stream.ticketPrice > 0;
    const autoEndThreshold = isTicketed ? AUTO_END_TICKETED_MS : AUTO_END_FREE_MS;

    const isBRB = timeSinceHeartbeat >= BRB_THRESHOLD_MS && timeSinceHeartbeat < autoEndThreshold;
    const shouldAutoEnd = timeSinceHeartbeat >= autoEndThreshold;

    return NextResponse.json({
      status: 'live',
      isHealthy: timeSinceHeartbeat < BRB_THRESHOLD_MS,
      isBRB,
      shouldAutoEnd,
      secondsSinceHeartbeat: Math.round(timeSinceHeartbeat / 1000),
      gracePeriodSeconds: Math.round(autoEndThreshold / 1000),
      remainingGraceSeconds: Math.max(0, Math.round((autoEndThreshold - timeSinceHeartbeat) / 1000)),
    });
  } catch (error) {
    console.error('[Heartbeat] Error checking status:', error);
    return NextResponse.json(
      { error: 'Failed to check stream health' },
      { status: 500 }
    );
  }
}
