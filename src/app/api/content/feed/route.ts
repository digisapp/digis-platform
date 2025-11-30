import { NextRequest, NextResponse } from 'next/server';
import { ContentService } from '@/lib/content/content-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const creatorId = searchParams.get('creatorId') || undefined;
    const contentType = searchParams.get('contentType') as 'photo' | 'video' | 'gallery' | undefined;

    const content = await withTimeoutAndRetry(
      () => ContentService.getContentFeed({
        limit: Math.min(limit, 50), // Max 50 items for performance
        offset: Math.max(offset, 0),
        creatorId,
        contentType,
      }),
      { timeoutMs: 8000, retries: 1, tag: 'contentFeed' }
    );

    return NextResponse.json({
      content,
      count: content.length,
    });
  } catch (error: any) {
    console.error('[CONTENT/FEED]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Service temporarily unavailable' : 'Failed to fetch content', content: [] },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}
