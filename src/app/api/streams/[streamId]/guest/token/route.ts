import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamGuestRequests, users } from '@/lib/data/system';
import { eq, and, or } from 'drizzle-orm';
import { AccessToken } from 'livekit-server-sdk';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Guest gets LiveKit token with publish permissions
 */
export async function GET(
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

    // Check if stream exists
    const stream = await db.query.streams.findFirst({
      where: and(
        eq(streams.id, streamId),
        eq(streams.status, 'live')
      ),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found or not live' }, { status: 404 });
    }

    // Check if user is the accepted guest
    if (stream.activeGuestId !== user.id) {
      return NextResponse.json({ error: 'You are not the active guest for this stream' }, { status: 403 });
    }

    // Get user's guest request to check request type (video/voice)
    const guestRequest = await db.query.streamGuestRequests.findFirst({
      where: and(
        eq(streamGuestRequests.streamId, streamId),
        eq(streamGuestRequests.userId, user.id),
        or(
          eq(streamGuestRequests.status, 'accepted'),
          eq(streamGuestRequests.status, 'active')
        )
      ),
    });

    if (!guestRequest) {
      return NextResponse.json({ error: 'No accepted guest request found' }, { status: 403 });
    }

    // Get user profile for display name
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        username: true,
        displayName: true,
      },
    });

    const displayName = userProfile?.displayName || userProfile?.username || 'Guest';

    // Generate LiveKit token with publish permissions
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: displayName,
      metadata: JSON.stringify({
        role: 'guest',
        requestType: guestRequest.requestType,
        username: userProfile?.username,
      }),
    });

    // Grant appropriate permissions based on request type
    const canPublishVideo = guestRequest.requestType === 'video';

    at.addGrant({
      roomJoin: true,
      room: stream.roomName,
      canPublish: true, // Guests can publish
      canPublishData: true,
      canSubscribe: true,
      // For voice-only, they can still publish (audio only) - UI will handle video toggle
    });

    const token = await at.toJwt();
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    // Update guest request status to active and set joinedAt
    await db.update(streamGuestRequests)
      .set({
        status: 'active',
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(streamGuestRequests.id, guestRequest.id));

    // Notify all viewers that guest has joined
    await AblyRealtimeService.broadcastToStream(streamId, 'guest-joined', {
      userId: user.id,
      username: userProfile?.username,
      displayName,
      requestType: guestRequest.requestType,
    });

    return NextResponse.json({
      token,
      serverUrl,
      roomName: stream.roomName,
      requestType: guestRequest.requestType,
      canPublishVideo,
    });
  } catch (error: any) {
    console.error('[Guest Token] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get guest token' },
      { status: 500 }
    );
  }
}
