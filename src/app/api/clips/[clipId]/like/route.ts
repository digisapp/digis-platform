import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, clips, clipLikes } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Like/Unlike a clip
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clipId } = await params;

    // Check if clip exists
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Check if already liked
    const existingLike = await db.query.clipLikes.findFirst({
      where: and(
        eq(clipLikes.clipId, clipId),
        eq(clipLikes.userId, user.id)
      ),
    });

    if (existingLike) {
      // Unlike - remove the like
      await db.delete(clipLikes).where(
        and(
          eq(clipLikes.clipId, clipId),
          eq(clipLikes.userId, user.id)
        )
      );

      // Decrement like count
      await db.update(clips)
        .set({ likeCount: sql`GREATEST(${clips.likeCount} - 1, 0)` })
        .where(eq(clips.id, clipId));

      return NextResponse.json({ liked: false });
    } else {
      // Like - add the like
      await db.insert(clipLikes).values({
        clipId,
        userId: user.id,
      });

      // Increment like count
      await db.update(clips)
        .set({ likeCount: sql`${clips.likeCount} + 1` })
        .where(eq(clips.id, clipId));

      return NextResponse.json({ liked: true });
    }
  } catch (error: any) {
    console.error('Error liking clip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to like clip' },
      { status: 500 }
    );
  }
}

// GET - Check if user has liked a clip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ liked: false });
    }

    const { clipId } = await params;

    const existingLike = await db.query.clipLikes.findFirst({
      where: and(
        eq(clipLikes.clipId, clipId),
        eq(clipLikes.userId, user.id)
      ),
    });

    return NextResponse.json({ liked: !!existingLike });
  } catch (error: any) {
    console.error('Error checking like status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check like status' },
      { status: 500 }
    );
  }
}
