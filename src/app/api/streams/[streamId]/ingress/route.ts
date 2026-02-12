import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { LiveKitIngressService } from '@/lib/services/livekit-ingress-service';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/streams/[streamId]/ingress
 * Creates an RTMP ingress for a stream (OBS/Streamlabs support).
 * Returns the RTMP URL and stream key for the creator to enter in their encoder.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  const requestId = nanoid(10);
  const { streamId } = await params;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401 }
      );
    }

    // Get the stream and verify ownership
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json(
        failure('Stream not found', 'validation', requestId),
        { status: 404 }
      );
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json(
        failure('Not authorized to manage this stream', 'auth', requestId),
        { status: 403 }
      );
    }

    if (stream.status !== 'live') {
      return NextResponse.json(
        failure('Stream is not live', 'validation', requestId),
        { status: 400 }
      );
    }

    // Don't create duplicate ingresses
    if (stream.ingressId) {
      // Return existing ingress info
      try {
        const info = await LiveKitIngressService.getIngressInfo(stream.ingressId);
        if (info) {
          return NextResponse.json(
            success({ url: info.url, streamKey: info.streamKey }, requestId)
          );
        }
      } catch {
        // Ingress may have been deleted, fall through to create new one
      }
    }

    // Create RTMP ingress
    const { ingressId, url, streamKey } = await LiveKitIngressService.createRtmpIngress(
      stream.roomName,
      `host-${user.id}`,
      'Broadcaster'
    );

    // Update stream with ingress details
    await db
      .update(streams)
      .set({
        ingressId,
        streamKey,
        streamMethod: 'rtmp',
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    console.log(`[Ingress API] Created RTMP ingress for stream ${streamId}`);

    return NextResponse.json(
      success({ url, streamKey }, requestId),
      { status: 201 }
    );
  } catch (error) {
    console.error('[Ingress API] Error creating ingress:', error);
    return NextResponse.json(
      failure('Failed to create RTMP ingress', 'unknown', requestId),
      { status: 500 }
    );
  }
}
