import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StreamService } from '@/lib/streams/stream-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    let targetUserId: string;

    // If userId is provided, use it (public view of another creator's streams)
    if (userId) {
      targetUserId = userId;
      console.log('[MY_STREAMS] Public view', { requestId, targetUserId });
    } else {
      // Otherwise, require authentication and use current user
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          failure('Unauthorized', 'auth', requestId),
          { status: 401, headers: { 'x-request-id': requestId } }
        );
      }
      targetUserId = user.id;
      console.log('[MY_STREAMS] Own streams', { requestId, targetUserId });
    }

    try {
      const streams = await withTimeoutAndRetry(
        () => StreamService.getCreatorStreams(targetUserId, 50),
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
        targetUserId
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
        'Failed to fetch streams - please try again',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
