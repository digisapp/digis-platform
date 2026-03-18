import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { communityPosts, postLikes, users, follows, subscriptions } from '@/db/schema';
import { eq, and, desc, sql, inArray, or } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/community/posts?creatorId=xxx&cursor=xxx&limit=20
 * Returns community posts for a creator's profile
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId required' }, { status: 400 });
    }

    // Get current user for visibility/like checks
    let currentUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    } catch { /* not authenticated */ }

    // Determine visibility level
    let visibilityFilter;
    if (currentUserId === creatorId) {
      // Creator sees all their own posts
      visibilityFilter = eq(communityPosts.creatorId, creatorId);
    } else if (currentUserId) {
      // Check if user follows or is subscribed
      const [followCheck, subCheck] = await Promise.all([
        db.query.follows.findFirst({
          where: and(eq(follows.followerId, currentUserId), eq(follows.followingId, creatorId)),
        }),
        db.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, currentUserId),
            eq(subscriptions.creatorId, creatorId),
            eq(subscriptions.status, 'active'),
          ),
        }),
      ]);

      const isFollower = !!followCheck;
      const isSubscriber = !!subCheck;

      if (isSubscriber) {
        visibilityFilter = eq(communityPosts.creatorId, creatorId);
      } else if (isFollower) {
        visibilityFilter = and(
          eq(communityPosts.creatorId, creatorId),
          or(
            eq(communityPosts.visibility, 'public'),
            eq(communityPosts.visibility, 'followers'),
          ),
        );
      } else {
        visibilityFilter = and(
          eq(communityPosts.creatorId, creatorId),
          eq(communityPosts.visibility, 'public'),
        );
      }
    } else {
      visibilityFilter = and(
        eq(communityPosts.creatorId, creatorId),
        eq(communityPosts.visibility, 'public'),
      );
    }

    const cursorCondition = cursor
      ? sql`${communityPosts.createdAt} < ${cursor}`
      : sql`true`;

    const posts = await db
      .select({
        id: communityPosts.id,
        text: communityPosts.text,
        imageUrl: communityPosts.imageUrl,
        imageAspectRatio: communityPosts.imageAspectRatio,
        visibility: communityPosts.visibility,
        isPinned: communityPosts.isPinned,
        likeCount: communityPosts.likeCount,
        commentCount: communityPosts.commentCount,
        createdAt: communityPosts.createdAt,
        creatorUsername: users.username,
        creatorDisplayName: users.displayName,
        creatorAvatarUrl: users.avatarUrl,
        creatorIsVerified: users.isCreatorVerified,
      })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.creatorId, users.id))
      .where(and(visibilityFilter, cursorCondition))
      .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
      .limit(limit);

    // Check which posts current user has liked
    let likedPostIds = new Set<string>();
    if (currentUserId && posts.length > 0) {
      const likes = await db
        .select({ postId: postLikes.postId })
        .from(postLikes)
        .where(and(
          eq(postLikes.userId, currentUserId),
          inArray(postLikes.postId, posts.map(p => p.id)),
        ));
      likedPostIds = new Set(likes.map(l => l.postId));
    }

    const items = posts.map(p => ({
      ...p,
      isLiked: likedPostIds.has(p.id),
      createdAt: p.createdAt.toISOString(),
    }));

    const nextCursor = posts.length === limit
      ? posts[posts.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error('[Community Posts GET]', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

/**
 * POST /api/community/posts
 * Create a new community post (creator only)
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'community:post');
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Creator only' }, { status: 403 });
    }

    const body = await request.json();
    const { text, imageUrl, imageAspectRatio, visibility } = body;

    if (!text && !imageUrl) {
      return NextResponse.json({ error: 'Post must have text or image' }, { status: 400 });
    }

    if (text && text.length > 2000) {
      return NextResponse.json({ error: 'Text too long (max 2000 chars)' }, { status: 400 });
    }

    const validVisibility = ['public', 'followers', 'subscribers'];
    const postVisibility = validVisibility.includes(visibility) ? visibility : 'public';

    const [post] = await db.insert(communityPosts).values({
      creatorId: user.id,
      text: text || null,
      imageUrl: imageUrl || null,
      imageAspectRatio: imageAspectRatio || null,
      visibility: postVisibility,
    }).returning();

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[Community Posts POST]', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

/**
 * DELETE /api/community/posts?id=xxx
 * Delete a community post (creator only, own posts)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');
    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    // Only delete own posts
    const deleted = await db.delete(communityPosts)
      .where(and(eq(communityPosts.id, postId), eq(communityPosts.creatorId, user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Community Posts DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
