import { NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = nanoid(10);

  try {
    console.log('[STREAMS_LIVE]', { requestId });

    // Fetch live streams with timeout and retry
    try {
      const liveStreams = await withTimeoutAndRetry(
        () => StreamService.getLiveStreams(),
        {
          timeoutMs: 3000,  // Reduced from 6s
          retries: 1,       // Reduced from 2
          tag: 'getLiveStreams'
        }
      );

      return NextResponse.json(
        success({ streams: liveStreams }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[STREAMS_LIVE]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      });

      // Return degraded response with empty streams list
      return NextResponse.json(
        degraded(
          { streams: [] },
          'Live streams temporarily unavailable - please try again in a moment',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[STREAMS_LIVE]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded(
        { streams: [] },
        'Failed to fetch live streams - please try again',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
