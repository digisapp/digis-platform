import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { communityPosts, postLikes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    // Check if already liked
    const existing = await db.query.postLikes.findFirst({
      where: and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)),
    });

    if (existing) {
      // Unlike
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
      await db.update(communityPosts)
        .set({ likeCount: sql`GREATEST(${communityPosts.likeCount} - 1, 0)` })
        .where(eq(communityPosts.id, postId));
      return NextResponse.json({ liked: false });
    }

    // Like
    await db.insert(postLikes).values({ postId, userId: user.id });
    await db.update(communityPosts)
      .set({ likeCount: sql`${communityPosts.likeCount} + 1` })
      .where(eq(communityPosts.id, postId));

    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error('[Post Like]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
