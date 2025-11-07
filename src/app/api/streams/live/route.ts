import { NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const liveStreams = await StreamService.getLiveStreams();

    return NextResponse.json({ streams: liveStreams });
  } catch (error: any) {
    console.error('Error fetching live streams:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch live streams' },
      { status: 500 }
    );
  }
}
