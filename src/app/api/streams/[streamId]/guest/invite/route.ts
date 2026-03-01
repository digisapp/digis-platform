import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamGuestRequests, users } from '@/lib/data/system';
import { eq, and, or } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Host invites a viewer to join as co-host
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
    const { viewerId, inviteType } = body;

    if (!viewerId) {
      return NextResponse.json({ error: 'Viewer ID is required' }, { status: 400 });
    }

    if (!['video', 'voice'].includes(inviteType)) {
      return NextResponse.json({ error: 'Invalid invite type' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only the host can invite viewers' }, { status: 403 });
    }

    // Can't invite yourself
    if (viewerId === user.id) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Check if there's already an active guest
    if (stream.activeGuestId) {
      return NextResponse.json({ error: 'There is already an active guest on the stream' }, { status: 400 });
    }

    // Check if viewer already has a pending invite or active request
    const existingRequest = await db.query.streamGuestRequests.findFirst({
      where: and(
        eq(streamGuestRequests.streamId, streamId),
        eq(streamGuestRequests.userId, viewerId),
        or(
          eq(streamGuestRequests.status, 'pending'),
          eq(streamGuestRequests.status, 'invited'),
          eq(streamGuestRequests.status, 'accepted'),
          eq(streamGuestRequests.status, 'active')
        )
      ),
    });

    if (existingRequest) {
      return NextResponse.json({
        error: 'This viewer already has a pending invite or is already active',
        existingRequest: {
          id: existingRequest.id,
          status: existingRequest.status,
        }
      }, { status: 400 });
    }

    // Get viewer profile
    const viewerProfile = await db.query.users.findFirst({
      where: eq(users.id, viewerId),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!viewerProfile?.username) {
      return NextResponse.json({ error: 'Viewer not found' }, { status: 404 });
    }

    // Get host profile for the invite notification
    const hostProfile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // Create the invite (as a guest request with 'invited' status)
    const [invite] = await db.insert(streamGuestRequests).values({
      streamId,
      userId: viewerId,
      username: viewerProfile.username,
      displayName: viewerProfile.displayName,
      avatarUrl: viewerProfile.avatarUrl,
      requestType: inviteType,
      status: 'invited',
    }).returning();

    // Notify the viewer via Ably
    const inviteData = {
      inviteId: invite.id,
      viewerId,
      inviteType,
      host: {
        id: user.id,
        username: hostProfile?.username,
        displayName: hostProfile?.displayName,
        avatarUrl: hostProfile?.avatarUrl,
      },
      streamTitle: stream.title,
    };

    let broadcastSuccess = true;
    try {
      // Send invite directly to the viewer's notification channel (more reliable than broadcast)
      console.log('[Guest Invite] Sending to viewer:', viewerId, 'event: guest_invite', 'data:', inviteData);
      await AblyRealtimeService.broadcastGuestInvite(viewerId, inviteData);
      console.log('[Guest Invite] Notification sent to viewer');
    } catch (broadcastError) {
      console.error('[Guest Invite] Notification failed:', broadcastError);
      broadcastSuccess = false;
    }

    return NextResponse.json({
      success: true,
      invite,
      message: broadcastSuccess
        ? 'Invite sent! Waiting for viewer to accept.'
        : 'Invite created but notification may be delayed. Viewer can still accept from their viewer list.',
      broadcastSuccess,
    });
  } catch (error: any) {
    console.error('[Guest Invite] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send invite' },
      { status: 500 }
    );
  }
}
