import { NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { getCachedGifts } from '@/lib/cache/hot-data-cache';

export const runtime = 'nodejs';

/**
 * GET /api/gifts - Get all virtual gifts
 *
 * Cached for 1 hour via Redis (gifts rarely change)
 * Cache is invalidated when gifts are added/updated
 */
export async function GET() {
  try {
    // Use Redis cache - gifts catalog rarely changes
    const gifts = await getCachedGifts(() => StreamService.getAllGifts());

    return NextResponse.json(
      { gifts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gifts' },
      { status: 500 }
    );
  }
}
