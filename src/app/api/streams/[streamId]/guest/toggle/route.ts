import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Host toggles guest requests enabled/disabled
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

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    // Check if stream exists and user is the host
    const stream = await db.query.streams.findFirst({
      where: and(
        eq(streams.id, streamId),
        eq(streams.status, 'live')
      ),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found or not live' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the host can toggle guest requests' }, { status: 403 });
    }

    // Update the stream
    await db.update(streams)
      .set({
        guestRequestsEnabled: enabled,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    // Notify viewers of the change
    await AblyRealtimeService.broadcastToStream(streamId, 'guest-requests-toggle', {
      enabled,
    });

    return NextResponse.json({
      success: true,
      guestRequestsEnabled: enabled,
      message: enabled ? 'Guest requests enabled' : 'Guest requests disabled',
    });
  } catch (error: any) {
    console.error('[Guest Toggle] Error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle guest requests' },
      { status: 500 }
    );
  }
}
