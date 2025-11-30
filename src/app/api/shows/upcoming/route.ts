import { NextRequest, NextResponse } from 'next/server';
import { ShowService } from '@/lib/shows/show-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const creatorId = searchParams.get('creatorId') || undefined;
    const showType = searchParams.get('showType') as any;

    const shows = await withTimeoutAndRetry(
      () => ShowService.getUpcomingShows({
        limit,
        offset,
        creatorId,
        showType,
        upcoming: true,
      }),
      { timeoutMs: 8000, retries: 1, tag: 'upcomingShows' }
    );

    return NextResponse.json({
      success: true,
      shows,
      count: shows.length,
    });
  } catch (error: any) {
    console.error('[SHOWS/UPCOMING]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Service temporarily unavailable' : 'Failed to fetch shows', shows: [] },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}
