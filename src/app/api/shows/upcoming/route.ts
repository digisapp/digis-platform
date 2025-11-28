import { NextRequest, NextResponse } from 'next/server';
import { ShowService } from '@/lib/shows/show-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const creatorId = searchParams.get('creatorId') || undefined;
    const showType = searchParams.get('showType') as any;

    const shows = await ShowService.getUpcomingShows({
      limit,
      offset,
      creatorId,
      showType,
      upcoming: true,
    });

    return NextResponse.json({
      success: true,
      shows,
      count: shows.length,
    });
  } catch (error) {
    console.error('Error fetching upcoming shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shows' },
      { status: 500 }
    );
  }
}
