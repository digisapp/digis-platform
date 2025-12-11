import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, contentLikes, contentItems } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/content/like - Like or unlike content
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await request.json();

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    // Check if content exists
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
      columns: { id: true, likeCount: true },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Check if user already liked this content
    const existingLike = await db.query.contentLikes.findFirst({
      where: and(
        eq(contentLikes.contentId, contentId),
        eq(contentLikes.userId, user.id)
      ),
    });

    if (existingLike) {
      // Unlike - remove the like
      await db.delete(contentLikes).where(
        and(
          eq(contentLikes.contentId, contentId),
          eq(contentLikes.userId, user.id)
        )
      );

      // Decrement like count
      await db.update(contentItems)
        .set({ likeCount: sql`GREATEST(${contentItems.likeCount} - 1, 0)` })
        .where(eq(contentItems.id, contentId));

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: Math.max((content.likeCount || 0) - 1, 0),
      });
    } else {
      // Like - add the like
      await db.insert(contentLikes).values({
        contentId,
        userId: user.id,
      });

      // Increment like count
      await db.update(contentItems)
        .set({ likeCount: sql`${contentItems.likeCount} + 1` })
        .where(eq(contentItems.id, contentId));

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: (content.likeCount || 0) + 1,
      });
    }
  } catch (error: any) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle like' },
      { status: 500 }
    );
  }
}

// GET /api/content/like?contentId=xxx - Check if user liked content
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    // Get content with like count
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
      columns: { id: true, likeCount: true },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Check if user liked (only if authenticated)
    let liked = false;
    if (user) {
      const existingLike = await db.query.contentLikes.findFirst({
        where: and(
          eq(contentLikes.contentId, contentId),
          eq(contentLikes.userId, user.id)
        ),
      });
      liked = !!existingLike;
    }

    return NextResponse.json({
      liked,
      likeCount: content.likeCount || 0,
    });
  } catch (error: any) {
    console.error('Error checking like status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check like status' },
      { status: 500 }
    );
  }
}
