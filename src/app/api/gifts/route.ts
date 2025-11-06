import { NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';

export async function GET() {
  try {
    const gifts = await StreamService.getAllGifts();

    return NextResponse.json({ gifts });
  } catch (error: any) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gifts' },
      { status: 500 }
    );
  }
}
