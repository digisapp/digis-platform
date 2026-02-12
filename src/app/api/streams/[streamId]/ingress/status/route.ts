import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { LiveKitIngressService } from '@/lib/services/livekit-ingress-service';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Map numeric status to string labels
const STATUS_LABELS: Record<number, string> = {
  0: 'ENDPOINT_INACTIVE',
  1: 'ENDPOINT_BUFFERING',
  2: 'ENDPOINT_PUBLISHING',
  3: 'ENDPOINT_ERROR',
  4: 'ENDPOINT_COMPLETE',
};

/**
 * GET /api/streams/[streamId]/ingress/status
 * Checks the RTMP ingress connection status (is OBS connected?).
 */
export async function GET(
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

    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: { ingressId: true, creatorId: true },
    });

    if (!stream) {
      return NextResponse.json(
        failure('Stream not found', 'validation', requestId),
        { status: 404 }
      );
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json(
        failure('Not authorized', 'auth', requestId),
        { status: 403 }
      );
    }

    if (!stream.ingressId) {
      return NextResponse.json(
        success({ status: 'NO_INGRESS', label: 'No ingress configured' }, requestId)
      );
    }

    const info = await LiveKitIngressService.getIngressInfo(stream.ingressId);

    if (!info) {
      return NextResponse.json(
        success({ status: 'NOT_FOUND', label: 'Ingress not found' }, requestId)
      );
    }

    const statusCode = info.state?.status ?? 0;
    const label = STATUS_LABELS[statusCode] || 'UNKNOWN';

    return NextResponse.json(
      success({
        status: label,
        statusCode,
        error: info.state?.error || null,
      }, requestId)
    );
  } catch (error) {
    console.error('[Ingress Status] Error:', error);
    return NextResponse.json(
      failure('Failed to check ingress status', 'unknown', requestId),
      { status: 500 }
    );
  }
}
