import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';
import { addStreamViewer, getStreamViewerCount } from '@/lib/cache/hot-data-cache';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Track last broadcast time per stream to throttle broadcasts
const lastBroadcast = new Map<string, number>();
const BROADCAST_THROTTLE_MS = 5000; // Broadcast at most every 5 seconds

/**
 * POST /api/streams/[streamId]/viewer-heartbeat
 * Viewer heartbeat - keeps viewer active and returns updated viewer count
 * Called periodically by viewers to maintain accurate viewer count
 *
 * Uses Redis HyperLogLog for approximate unique viewer counting
 * This prevents DB write storms from frequent heartbeats
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await params;

    // Use Redis HyperLogLog for viewer counting (prevents DB write storms)
    // This gives us approximate unique viewer count with O(1) space
    const redisViewerCount = await addStreamViewer(streamId, user.id);

    // Also update DB viewer record (less frequently - only needed for user tracking)
    // Fire-and-forget to not block the response
    StreamService.updateViewerHeartbeat(streamId, user.id).catch(err =>
      console.error('[viewer-heartbeat] DB update error:', err)
    );

    // Get peak viewers from DB (this is still tracked there for persistence)
    // Use cached count from Redis for current viewers
    let peakViewers = 0;
    try {
      const stream = await StreamService.getStream(streamId);
      peakViewers = stream?.peakViewers || 0;

      // Update peak if current exceeds it (in DB for persistence)
      if (redisViewerCount > peakViewers) {
        peakViewers = redisViewerCount;
        // Fire-and-forget peak update
        StreamService.updatePeakViewers(streamId, redisViewerCount).catch(err =>
          console.error('[viewer-heartbeat] Peak update error:', err)
        );
      }
    } catch (err) {
      console.error('[viewer-heartbeat] Stream fetch error:', err);
    }

    // Throttled broadcast to prevent flooding Ably
    const now = Date.now();
    const lastTime = lastBroadcast.get(streamId) || 0;
    if (now - lastTime > BROADCAST_THROTTLE_MS) {
      lastBroadcast.set(streamId, now);
      AblyRealtimeService.broadcastViewerCount(
        streamId,
        redisViewerCount,
        peakViewers
      ).catch(err => console.error('[viewer-heartbeat] Broadcast error:', err));
    }

    return NextResponse.json({
      currentViewers: redisViewerCount,
      peakViewers,
    });
  } catch (error: any) {
    console.error('Error in viewer heartbeat:', error);
    return NextResponse.json(
      { error: error.message || 'Heartbeat failed' },
      { status: 500 }
    );
  }
}
