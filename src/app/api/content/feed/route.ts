import { NextRequest, NextResponse } from 'next/server';
import { ContentService } from '@/lib/content/content-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const creatorId = searchParams.get('creatorId') || undefined;
    const contentType = searchParams.get('contentType') as 'photo' | 'video' | 'gallery' | undefined;

    const content = await ContentService.getContentFeed({
      limit: Math.min(limit, 100), // Max 100 items
      offset: Math.max(offset, 0),
      creatorId,
      contentType,
    });

    return NextResponse.json({
      content,
      count: content.length,
    });
  } catch (error: any) {
    console.error('Error fetching content feed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
