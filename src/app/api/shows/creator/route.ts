import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    console.log('[CREATOR_SHOWS]', { requestId, userId: user.id });

    try {
      const shows = await withTimeoutAndRetry(
        () => ShowService.getCreatorShows(user.id),
        {
          timeoutMs: 5000,
          retries: 1,
          tag: 'getCreatorShows'
        }
      );

      return NextResponse.json(
        { success: true, data: shows },
        { headers: { 'x-request-id': requestId } }
      );
    } catch (error) {
      console.error('[CREATOR_SHOWS] Database error:', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id
      });

      // Return empty array instead of error for better UX
      return NextResponse.json(
        degraded(
          [],
          'Shows temporarily unavailable',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error) {
    console.error('[CREATOR_SHOWS] Fatal error:', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded(
        [],
        'Failed to fetch shows',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
