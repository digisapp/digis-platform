import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/streams/[streamId]/viewer-heartbeat
 * Viewer heartbeat - keeps viewer active and returns updated viewer count
 * Called periodically by viewers to maintain accurate viewer count
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

    // Update viewer's last seen time
    await StreamService.updateViewerHeartbeat(streamId, user.id);

    // Get and return updated viewer count (this also cleans up stale viewers)
    const counts = await StreamService.updateViewerCount(streamId);

    // Broadcast updated count to all viewers via Ably
    if (counts) {
      AblyRealtimeService.broadcastViewerCount(
        streamId,
        counts.currentViewers,
        counts.peakViewers
      ).catch(err => console.error('[viewer-heartbeat] Broadcast error:', err));
    }

    return NextResponse.json({
      currentViewers: counts?.currentViewers || 0,
      peakViewers: counts?.peakViewers || 0,
    });
  } catch (error: any) {
    console.error('Error in viewer heartbeat:', error);
    return NextResponse.json(
      { error: error.message || 'Heartbeat failed' },
      { status: 500 }
    );
  }
}
