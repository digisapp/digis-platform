import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamGuestRequests, users } from '@/lib/data/system';
import { eq, and, or, lt } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { rateLimitGuestRequest } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Guest requests expire after 10 minutes
const GUEST_REQUEST_TTL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

/**
 * Expire stale pending guest requests (older than TTL)
 * Returns the IDs and user info of expired requests for notification
 */
async function expireStaleRequests(streamId: string): Promise<Array<{ id: string; userId: string; username: string }>> {
  const expirationTime = new Date(Date.now() - GUEST_REQUEST_TTL_MS);

  // Find and update expired pending requests
  const expiredRequests = await db
    .update(streamGuestRequests)
    .set({
      status: 'ended',
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(streamGuestRequests.streamId, streamId),
      eq(streamGuestRequests.status, 'pending'),
      lt(streamGuestRequests.requestedAt, expirationTime)
    ))
    .returning({
      id: streamGuestRequests.id,
      userId: streamGuestRequests.userId,
      username: streamGuestRequests.username,
    });

  // Notify via Ably if any requests expired
  if (expiredRequests.length > 0) {
    for (const request of expiredRequests) {
      await AblyRealtimeService.broadcastToStream(streamId, 'guest-request-expired', {
        requestId: request.id,
        userId: request.userId,
        reason: 'Request expired after 10 minutes',
      }).catch(err => {
        console.error('[Guest Request TTL] Failed to broadcast expiration:', err);
      });
    }
    console.log(`[Guest Request TTL] Expired ${expiredRequests.length} stale requests for stream ${streamId}`);
  }

  return expiredRequests;
}

/**
 * POST - Viewer requests to join stream as guest
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
    const requestType = body.requestType || 'video'; // 'video' or 'voice'

    if (!['video', 'voice'].includes(requestType)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    // Check if stream exists and has guest requests enabled
    const stream = await db.query.streams.findFirst({
      where: and(
        eq(streams.id, streamId),
        eq(streams.status, 'live')
      ),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found or not live' }, { status: 404 });
    }

    if (!stream.guestRequestsEnabled) {
      return NextResponse.json({ error: 'Guest requests are not enabled for this stream' }, { status: 403 });
    }

    // Can't request if you're the host
    if (stream.creatorId === user.id) {
      return NextResponse.json({ error: 'Host cannot request to join as guest' }, { status: 400 });
    }

    // Check cooldown (applies after rejection - 2 minute wait)
    const rateCheck = await rateLimitGuestRequest(user.id, streamId);
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) }
        }
      );
    }

    // Check if user already has a pending or active request
    const existingRequest = await db.query.streamGuestRequests.findFirst({
      where: and(
        eq(streamGuestRequests.streamId, streamId),
        eq(streamGuestRequests.userId, user.id),
        or(
          eq(streamGuestRequests.status, 'pending'),
          eq(streamGuestRequests.status, 'accepted'),
          eq(streamGuestRequests.status, 'active')
        )
      ),
    });

    if (existingRequest) {
      return NextResponse.json({
        error: 'You already have a pending or active request',
        existingRequest: {
          id: existingRequest.id,
          status: existingRequest.status,
        }
      }, { status: 400 });
    }

    // Get user profile for display info
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!userProfile?.username) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
    }

    // Create the guest request
    const [guestRequest] = await db.insert(streamGuestRequests).values({
      streamId,
      userId: user.id,
      username: userProfile.username,
      displayName: userProfile.displayName,
      avatarUrl: userProfile.avatarUrl,
      requestType,
      status: 'pending',
    }).returning();

    // Notify the host via Ably
    try {
      await AblyRealtimeService.broadcastToStream(streamId, 'guest-request-new', {
        requestId: guestRequest.id,
        userId: user.id,
        username: userProfile.username,
        displayName: userProfile.displayName,
        avatarUrl: userProfile.avatarUrl,
        requestType,
      });
    } catch (broadcastError) {
      console.error('[Guest Request] Broadcast failed (request still created):', broadcastError);
      // Don't fail the request - guest request was created successfully in database
    }

    return NextResponse.json({
      success: true,
      request: guestRequest,
      message: 'Request sent! Waiting for host to accept.',
    });
  } catch (error: any) {
    console.error('[Guest Request] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send guest request' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get guest requests for a stream (host only) or check own request status (viewer)
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
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const isHost = stream.creatorId === user.id;

    // Auto-expire stale pending requests (older than 10 minutes)
    await expireStaleRequests(streamId);

    if (isHost) {
      // Host gets all pending requests (stale ones already expired above)
      const requests = await db.query.streamGuestRequests.findMany({
        where: and(
          eq(streamGuestRequests.streamId, streamId),
          or(
            eq(streamGuestRequests.status, 'pending'),
            eq(streamGuestRequests.status, 'accepted'),
            eq(streamGuestRequests.status, 'active')
          )
        ),
        orderBy: (gr, { asc }) => [asc(gr.requestedAt)],
      });

      return NextResponse.json({
        isHost: true,
        guestRequestsEnabled: stream.guestRequestsEnabled,
        activeGuestId: stream.activeGuestId,
        requests,
      });
    } else {
      // Viewer gets their own request status (stale ones already expired above)
      const myRequest = await db.query.streamGuestRequests.findFirst({
        where: and(
          eq(streamGuestRequests.streamId, streamId),
          eq(streamGuestRequests.userId, user.id),
          or(
            eq(streamGuestRequests.status, 'pending'),
            eq(streamGuestRequests.status, 'accepted'),
            eq(streamGuestRequests.status, 'active')
          )
        ),
      });

      // Get active guest details if there is one
      let activeGuest = null;
      if (stream.activeGuestId) {
        const activeGuestRequest = await db.query.streamGuestRequests.findFirst({
          where: and(
            eq(streamGuestRequests.streamId, streamId),
            eq(streamGuestRequests.userId, stream.activeGuestId),
            eq(streamGuestRequests.status, 'active')
          ),
        });
        if (activeGuestRequest) {
          activeGuest = {
            userId: activeGuestRequest.userId,
            username: activeGuestRequest.username,
            displayName: activeGuestRequest.displayName,
            avatarUrl: activeGuestRequest.avatarUrl,
            requestType: activeGuestRequest.requestType,
          };
        }
      }

      return NextResponse.json({
        isHost: false,
        guestRequestsEnabled: stream.guestRequestsEnabled,
        myRequest,
        activeGuest,
      });
    }
  } catch (error: any) {
    console.error('[Guest Requests GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get guest requests' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel own guest request (viewer) or clear all requests (host)
 */
export async function DELETE(
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

    // Update user's pending request to 'ended'
    await db.update(streamGuestRequests)
      .set({
        status: 'ended',
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(streamGuestRequests.streamId, streamId),
        eq(streamGuestRequests.userId, user.id),
        eq(streamGuestRequests.status, 'pending')
      ));

    return NextResponse.json({ success: true, message: 'Request cancelled' });
  } catch (error: any) {
    console.error('[Guest Request Cancel] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel request' },
      { status: 500 }
    );
  }
}
