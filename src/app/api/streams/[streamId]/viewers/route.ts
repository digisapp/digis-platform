import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const viewers = await StreamService.getCurrentViewers(streamId);

    return NextResponse.json({ viewers });
  } catch (error: any) {
    console.error('Error fetching viewers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewers' },
      { status: 500 }
    );
  }
}
