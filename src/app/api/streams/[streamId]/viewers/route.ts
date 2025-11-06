import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';

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
      { error: error.message || 'Failed to fetch viewers' },
      { status: 500 }
    );
  }
}
