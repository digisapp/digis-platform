import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Get stream to verify ownership
    const stream = await StreamService.getStream(streamId);

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only end your own streams' },
        { status: 403 }
      );
    }

    const updatedStream = await StreamService.endStream(streamId);

    // Broadcast stream ended to all viewers via Ably
    await AblyRealtimeService.broadcastStreamEnded(streamId);

    return NextResponse.json({ stream: updatedStream });
  } catch (error: any) {
    console.error('Error ending stream:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end stream' },
      { status: 500 }
    );
  }
}
