import { NextRequest, NextResponse } from 'next/server';
import { db, clips } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Increment share count for a clip
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const { clipId } = await params;

    // Verify clip exists
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Increment share count
    await db.update(clips)
      .set({ shareCount: sql`${clips.shareCount} + 1` })
      .where(eq(clips.id, clipId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking clip share:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track share' },
      { status: 500 }
    );
  }
}
