import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StreamService } from '@/lib/streams/stream-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    console.log('[MY_STREAMS]', {
      requestId,
      userId: user.id
    });

    try {
      const streams = await withTimeoutAndRetry(
        () => StreamService.getCreatorStreams(user.id, 50),
        {
          timeoutMs: 6000,
          retries: 2,
          tag: 'getCreatorStreams'
        }
      );

      return NextResponse.json(
        success({ streams }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[MY_STREAMS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id
      });

      return NextResponse.json(
        degraded(
          { streams: [] },
          'Streams temporarily unavailable - please try again in a moment',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[MY_STREAMS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded(
        { streams: [] },
        'Failed to fetch your streams - please try again',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
