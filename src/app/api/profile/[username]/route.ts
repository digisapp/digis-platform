import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { FollowService } from '@/lib/explore/follow-service';

// GET /api/profile/[username] - Get public user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    // Get the target user's profile
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        role: true,
        isCreatorVerified: true,
        isOnline: true,
        lastSeenAt: true,
        followerCount: true,
        followingCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get follow counts
    const followCounts = await FollowService.getFollowCounts(user.id);

    // Check if current user is following this profile (if authenticated)
    let isFollowing = false;
    try {
      const supabase = await createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (currentUser && currentUser.id !== user.id) {
        isFollowing = await FollowService.isFollowing(currentUser.id, user.id);
      }
    } catch (error) {
      // Not authenticated or error checking - just continue
    }

    return NextResponse.json({
      user,
      followCounts,
      isFollowing,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
