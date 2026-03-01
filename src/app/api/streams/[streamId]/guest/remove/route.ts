import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamGuestRequests } from '@/lib/data/system';
import { eq, and, or } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Host removes the active guest from stream
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

    // Check if stream exists and user is the host
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the host can remove guests' }, { status: 403 });
    }

    if (!stream.activeGuestId) {
      return NextResponse.json({ error: 'No active guest to remove' }, { status: 400 });
    }

    const guestUserId = stream.activeGuestId;

    // Find the active guest request
    const guestRequest = await db.query.streamGuestRequests.findFirst({
      where: and(
        eq(streamGuestRequests.streamId, streamId),
        eq(streamGuestRequests.userId, guestUserId),
        or(
          eq(streamGuestRequests.status, 'accepted'),
          eq(streamGuestRequests.status, 'active')
        )
      ),
    });

    // Calculate duration if we have joinedAt
    let durationSeconds: number | undefined;
    if (guestRequest?.joinedAt) {
      durationSeconds = Math.floor((Date.now() - guestRequest.joinedAt.getTime()) / 1000);
    }

    // Update the guest request to ended
    if (guestRequest) {
      await db.update(streamGuestRequests)
        .set({
          status: 'ended',
          endedAt: new Date(),
          durationSeconds,
          updatedAt: new Date(),
        })
        .where(eq(streamGuestRequests.id, guestRequest.id));
    }

    // Clear active guest from stream
    await db.update(streams)
      .set({
        activeGuestId: null,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    // Notify the guest and all viewers via Ably
    await AblyRealtimeService.broadcastToStream(streamId, 'guest-removed', {
      userId: guestUserId,
      username: guestRequest?.username,
    });

    return NextResponse.json({
      success: true,
      message: 'Guest removed from stream',
      durationSeconds,
    });
  } catch (error: any) {
    console.error('[Guest Remove] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove guest' },
      { status: 500 }
    );
  }
}
