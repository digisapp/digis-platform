import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { communityPosts, postComments, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/community/posts/[postId]/comments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const comments = await db
      .select({
        id: postComments.id,
        text: postComments.text,
        createdAt: postComments.createdAt,
        userId: postComments.userId,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt))
      .limit(limit);

    return NextResponse.json({
      comments: comments.map(c => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Post Comments GET]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/**
 * POST /api/community/posts/[postId]/comments
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const rateLimitResult = await rateLimit(request, 'community:comment');
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
    }

    const [comment] = await db.insert(postComments).values({
      postId,
      userId: user.id,
      text: text.trim(),
    }).returning();

    // Increment comment count
    await db.update(communityPosts)
      .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
      .where(eq(communityPosts.id, postId));

    // Get user info for response
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { username: true, displayName: true, avatarUrl: true },
    });

    return NextResponse.json({
      comment: {
        ...comment,
        username: dbUser?.username,
        displayName: dbUser?.displayName,
        avatarUrl: dbUser?.avatarUrl,
        createdAt: comment.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[Post Comments POST]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
