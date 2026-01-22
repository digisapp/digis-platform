import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/data/system';
import { follows } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { BlockService } from '@/lib/services/block-service';
import { NotificationService } from '@/lib/services/notification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Follow a creator
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ creatorId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const creatorId = params.creatorId;

    // Can't follow yourself
    if (user.id === creatorId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if blocked by the creator
    const isBlocked = await BlockService.isBlockedByCreator(creatorId, user.id);
    if (isBlocked) {
      return NextResponse.json({ error: 'Unable to follow this creator' }, { status: 403 });
    }

    // Check if already following
    const existing = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, user.id),
        eq(follows.followingId, creatorId)
      ),
    });

    if (existing) {
      return NextResponse.json({ message: 'Already following', isFollowing: true });
    }

    // Create follow
    await db.insert(follows).values({
      followerId: user.id,
      followingId: creatorId,
    });

    // Send notification to creator (async, non-blocking)
    (async () => {
      try {
        // Get follower info for the notification
        const follower = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { username: true, displayName: true, avatarUrl: true },
        });
        const followerName = follower?.displayName || follower?.username || 'Someone';
        const followerUsername = follower?.username || '';

        await NotificationService.sendNotification(
          creatorId,
          'follow',
          'New Follower',
          `${followerName} started following you`,
          followerUsername ? `/@${followerUsername}` : undefined,
          follower?.avatarUrl || undefined,
          { followerId: user.id }
        );
      } catch (err) {
        console.error('[FOLLOW] Failed to send notification:', err);
      }
    })();

    return NextResponse.json({ message: 'Now following', isFollowing: true });
  } catch (error: any) {
    console.error('[FOLLOW ERROR]', error);
    return NextResponse.json({ error: 'Failed to follow creator' }, { status: 500 });
  }
}

/**
 * Unfollow a creator
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ creatorId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const creatorId = params.creatorId;

    // Delete follow
    await db.delete(follows).where(
      and(
        eq(follows.followerId, user.id),
        eq(follows.followingId, creatorId)
      )
    );

    return NextResponse.json({ message: 'Unfollowed', isFollowing: false });
  } catch (error: any) {
    console.error('[UNFOLLOW ERROR]', error);
    return NextResponse.json({ error: 'Failed to unfollow creator' }, { status: 500 });
  }
}

/**
 * Check follow status
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ creatorId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isFollowing: false });
    }

    const params = await props.params;
    const creatorId = params.creatorId;

    const existing = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, user.id),
        eq(follows.followingId, creatorId)
      ),
    });

    return NextResponse.json({ isFollowing: !!existing });
  } catch (error: any) {
    console.error('[FOLLOW STATUS ERROR]', error);
    return NextResponse.json({ error: 'Failed to check follow status' }, { status: 500 });
  }
}
