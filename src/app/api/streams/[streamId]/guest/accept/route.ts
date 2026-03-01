import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamGuestRequests } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Host accepts a guest request
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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only the host can accept guest requests' }, { status: 403 });
    }

    // Check if there's already an active guest
    if (stream.activeGuestId) {
      return NextResponse.json({
        error: 'There is already an active guest. Remove them first.',
      }, { status: 400 });
    }

    // Get the guest request
    const guestRequest = await db.query.streamGuestRequests.findFirst({
      where: and(
        eq(streamGuestRequests.id, requestId),
        eq(streamGuestRequests.streamId, streamId),
        eq(streamGuestRequests.status, 'pending')
      ),
    });

    if (!guestRequest) {
      return NextResponse.json({ error: 'Guest request not found or already processed' }, { status: 404 });
    }

    // Update the request to accepted
    await db.update(streamGuestRequests)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(streamGuestRequests.id, requestId));

    // Update stream with active guest
    await db.update(streams)
      .set({
        activeGuestId: guestRequest.userId,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    // Notify the guest via Ably that they've been accepted
    try {
      await AblyRealtimeService.broadcastToStream(streamId, 'guest-request-accepted', {
        requestId,
        userId: guestRequest.userId,
        username: guestRequest.username,
        displayName: guestRequest.displayName,
        avatarUrl: guestRequest.avatarUrl,
        requestType: guestRequest.requestType,
      });

      // Also notify all viewers that a guest is joining
      await AblyRealtimeService.broadcastToStream(streamId, 'guest-joining', {
        userId: guestRequest.userId,
        username: guestRequest.username,
        displayName: guestRequest.displayName,
        avatarUrl: guestRequest.avatarUrl,
        requestType: guestRequest.requestType,
      });
    } catch (broadcastError) {
      // Log but don't fail - DB is already updated, guest can still join
      console.error('[Guest Accept] Broadcast failed (guest can still join):', broadcastError);
    }

    return NextResponse.json({
      success: true,
      message: 'Guest request accepted',
      guest: {
        userId: guestRequest.userId,
        username: guestRequest.username,
        displayName: guestRequest.displayName,
        avatarUrl: guestRequest.avatarUrl,
        requestType: guestRequest.requestType,
      },
    });
  } catch (error: any) {
    console.error('[Guest Accept] Error:', error);
    return NextResponse.json(
      { error: 'Failed to accept guest request' },
      { status: 500 }
    );
  }
}
