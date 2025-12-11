import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { streams } from '@/lib/data/system';
import { eq, and, lt } from 'drizzle-orm';
import { StreamService } from '@/lib/streams/stream-service';
import { publishToChannel } from '@/lib/ably/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Grace periods
const AUTO_END_FREE_MS = 5 * 60 * 1000; // 5 minutes
const AUTO_END_TICKETED_MS = 10 * 60 * 1000; // 10 minutes

/**
 * POST /api/streams/[streamId]/auto-end
 * Auto-end a stream that has exceeded the grace period
 * Can be called by viewers when they detect shouldAutoEnd=true
 * Idempotent - safe to call multiple times
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    // Get stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Already ended - idempotent
    if (stream.status !== 'live') {
      return NextResponse.json({
        success: true,
        message: 'Stream already ended',
        status: stream.status,
      });
    }

    // Check if grace period has actually expired
    const now = new Date();
    const lastHeartbeat = stream.lastHeartbeat;

    if (!lastHeartbeat) {
      // No heartbeat ever received - can't determine if expired
      // Allow ending if stream has been live for a while without heartbeat
      const startedAt = stream.startedAt;
      if (startedAt && now.getTime() - startedAt.getTime() < AUTO_END_FREE_MS) {
        return NextResponse.json({
          success: false,
          message: 'Stream recently started, waiting for heartbeat',
        }, { status: 400 });
      }
    } else {
      const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
      const isTicketed = stream.ticketPrice && stream.ticketPrice > 0;
      const autoEndThreshold = isTicketed ? AUTO_END_TICKETED_MS : AUTO_END_FREE_MS;

      if (timeSinceHeartbeat < autoEndThreshold) {
        return NextResponse.json({
          success: false,
          message: 'Grace period not yet expired',
          secondsRemaining: Math.round((autoEndThreshold - timeSinceHeartbeat) / 1000),
        }, { status: 400 });
      }
    }

    // End the stream
    console.log(`[AutoEnd] Auto-ending stream ${streamId} due to creator disconnection`);

    await StreamService.endStream(streamId);

    // Broadcast stream ended event
    try {
      await publishToChannel(`stream:${streamId}`, 'stream_ended', {
        streamId,
        reason: 'creator_disconnected',
        timestamp: now.toISOString(),
      });
    } catch (e) {
      console.error('[AutoEnd] Failed to publish stream_ended event:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Stream auto-ended due to creator disconnection',
    });
  } catch (error) {
    console.error('[AutoEnd] Error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-end stream' },
      { status: 500 }
    );
  }
}
