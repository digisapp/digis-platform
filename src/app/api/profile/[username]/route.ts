import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { FollowService } from '@/lib/explore/follow-service';
import { CallService } from '@/lib/services/call-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Get call settings for creators
    let callSettings = undefined;
    let messageRate = 0;
    if (user.role === 'creator') {
      try {
        const settings = await CallService.getCreatorSettings(user.id);
        callSettings = {
          callRatePerMinute: settings.callRatePerMinute,
          minimumCallDuration: settings.minimumCallDuration,
          isAvailableForCalls: settings.isAvailableForCalls,
          voiceCallRatePerMinute: settings.voiceCallRatePerMinute,
          minimumVoiceCallDuration: settings.minimumVoiceCallDuration,
          isAvailableForVoiceCalls: settings.isAvailableForVoiceCalls,
        };
        messageRate = settings.messageRate || 0;
      } catch (error) {
        // If no settings found, don't fail the request
        console.log('No call settings found for creator');
      }
    }

    return NextResponse.json({
      user,
      followCounts,
      isFollowing,
      callSettings,
      messageRate,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
