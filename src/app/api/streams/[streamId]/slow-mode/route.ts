import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { setSlowMode, getSlowMode } from '@/lib/rate-limit';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valid slow mode options (in seconds)
const VALID_SLOW_MODE_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 300];

/**
 * GET - Get current slow mode setting for a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const slowModeSeconds = await getSlowMode(streamId);

    return NextResponse.json({
      enabled: slowModeSeconds > 0,
      seconds: slowModeSeconds,
    });
  } catch (error: any) {
    console.error('[Slow Mode GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get slow mode setting' },
      { status: 500 }
    );
  }
}

/**
 * POST - Set slow mode for a stream (creator only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if stream exists and user is the creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the stream creator can set slow mode' }, { status: 403 });
    }

    const body = await request.json();
    const { seconds } = body;

    // Validate seconds
    if (typeof seconds !== 'number' || !VALID_SLOW_MODE_OPTIONS.includes(seconds)) {
      return NextResponse.json(
        { error: `Invalid slow mode value. Valid options: ${VALID_SLOW_MODE_OPTIONS.join(', ')} seconds` },
        { status: 400 }
      );
    }

    // Set slow mode in Redis
    await setSlowMode(streamId, seconds);

    // Broadcast slow mode change to all viewers
    await AblyRealtimeService.broadcastToStream(streamId, 'slow-mode-change', {
      enabled: seconds > 0,
      seconds,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      enabled: seconds > 0,
      seconds,
      message: seconds > 0
        ? `Slow mode enabled: ${seconds} seconds between messages`
        : 'Slow mode disabled',
    });
  } catch (error: any) {
    console.error('[Slow Mode POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set slow mode' },
      { status: 500 }
    );
  }
}
