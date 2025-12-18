import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamGuestRequests } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Host rejects a guest request
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
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the host can reject guest requests' }, { status: 403 });
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

    // Update the request to rejected
    await db.update(streamGuestRequests)
      .set({
        status: 'rejected',
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(streamGuestRequests.id, requestId));

    // Notify the guest via Ably that they've been rejected
    await AblyRealtimeService.broadcastToStream(streamId, 'guest-request-rejected', {
      requestId,
      userId: guestRequest.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Guest request rejected',
    });
  } catch (error: any) {
    console.error('[Guest Reject] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject guest request' },
      { status: 500 }
    );
  }
}
