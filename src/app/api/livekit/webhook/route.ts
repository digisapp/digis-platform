import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { db } from '@/lib/data/system';
import { streams, calls } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { LiveKitService } from '@/lib/services/livekit-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * LiveKit Webhook Handler
 *
 * Handles server-side events from LiveKit:
 * - room_finished: Clean up stream/call status when all participants leave
 * - egress_ended: Mark recording as complete
 *
 * Configure in LiveKit dashboard: POST https://your-domain.com/api/livekit/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('[LiveKit Webhook] Missing API credentials');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await req.text();
    const authHeader = req.headers.get('Authorization') || '';

    // Verify webhook signature
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    let event;
    try {
      event = await receiver.receive(body, authHeader);
    } catch (err) {
      console.error('[LiveKit Webhook] Signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const roomName = event.room?.name;
    if (!roomName) {
      return NextResponse.json({ ok: true });
    }

    console.log(`[LiveKit Webhook] ${event.event} for room: ${roomName}`);

    switch (event.event) {
      case 'room_finished':
        await handleRoomFinished(roomName);
        break;

      case 'egress_ended':
        await handleEgressEnded(roomName, event);
        break;

      default:
        // Log but don't process other events
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[LiveKit Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Handle room_finished: called when all participants leave and room closes
 * Updates stream/call status if they're still marked as active
 */
async function handleRoomFinished(roomName: string) {
  // Check if this is a stream room (prefix: stream_)
  if (roomName.startsWith('stream_')) {
    const stream = await db.query.streams.findFirst({
      where: and(
        eq(streams.roomName, roomName),
        eq(streams.status, 'live')
      ),
    });

    if (stream) {
      console.log(`[LiveKit Webhook] Stream room finished, marking ended: ${stream.id}`);
      await db
        .update(streams)
        .set({
          status: 'ended',
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(streams.id, stream.id));
    }
    // Delete the room to free LiveKit server resources
    await LiveKitService.deleteRoom(roomName);
    return;
  }

  // Check if this is a call room (prefix: call-)
  if (roomName.startsWith('call-')) {
    const call = await db.query.calls.findFirst({
      where: and(
        eq(calls.roomName, roomName),
        eq(calls.status, 'active')
      ),
    });

    if (call) {
      console.log(`[LiveKit Webhook] Call room finished, marking completed: ${call.id}`);
      // Note: billing is handled by the /api/calls/[callId]/end endpoint
      // This is a safety net for cases where neither party properly ended the call
      await db
        .update(calls)
        .set({
          status: 'completed',
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(calls.id, call.id));
    }
    // Delete the room to free LiveKit server resources
    await LiveKitService.deleteRoom(roomName);
    return;
  }

  // Check if this is a show room (prefix: show_)
  if (roomName.startsWith('show_')) {
    // Shows are managed by ShowService - just log for monitoring
    console.log(`[LiveKit Webhook] Show room finished: ${roomName}`);
    await LiveKitService.deleteRoom(roomName);
  }
}

/**
 * Handle egress_ended: called when a recording/egress completes
 * Log for monitoring - recording files are managed by egress service
 */
async function handleEgressEnded(roomName: string, event: any) {
  const egressId = event.egressInfo?.egressId;
  const status = event.egressInfo?.status;

  console.log(`[LiveKit Webhook] Egress ended for room ${roomName}: egressId=${egressId}, status=${status}`);

  // If egress failed, log a warning for investigation
  if (status !== 2) { // 2 = EGRESS_COMPLETE in LiveKit proto
    console.warn(`[LiveKit Webhook] Egress did not complete successfully: ${roomName}, status=${status}`);
  }
}
