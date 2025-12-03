import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { FollowService } from '@/lib/explore/follow-service';
import { CallService } from '@/lib/services/call-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/profile/[username] - Get public user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const requestId = nanoid(10);

  try {
    const { username } = await params;

    // Get the target user's profile with timeout and retry
    // OPTIMIZED: Reduced timeout from 8s to 3s, retries from 2 to 1
    // Using case-insensitive comparison via lower() to prevent "not found" errors
    const user = await withTimeoutAndRetry(
      () => db.query.users.findFirst({
        where: sql`lower(${users.username}) = lower(${username})`,
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
      }),
      { timeoutMs: 3000, retries: 1, tag: 'profileFetch' }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current user for follow check (don't await, get it for parallel queries)
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Batch all queries in parallel to reduce N+1 (4 sequential -> 1 parallel batch)
    const [followCounts, isFollowing, creatorSettings] = await Promise.all([
      // 1. Get follow counts
      FollowService.getFollowCounts(user.id),

      // 2. Check if current user is following (only if authenticated and different user)
      currentUser && currentUser.id !== user.id
        ? FollowService.isFollowing(currentUser.id, user.id)
        : Promise.resolve(false),

      // 3. Get creator settings if applicable
      user.role === 'creator'
        ? CallService.getCreatorSettings(user.id).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Build call settings from result
    let callSettings = undefined;
    let messageRate = 0;
    if (creatorSettings) {
      callSettings = {
        callRatePerMinute: creatorSettings.callRatePerMinute,
        minimumCallDuration: creatorSettings.minimumCallDuration,
        isAvailableForCalls: creatorSettings.isAvailableForCalls,
        voiceCallRatePerMinute: creatorSettings.voiceCallRatePerMinute,
        minimumVoiceCallDuration: creatorSettings.minimumVoiceCallDuration,
        isAvailableForVoiceCalls: creatorSettings.isAvailableForVoiceCalls,
      };
      messageRate = creatorSettings.messageRate || 0;
    }

    return NextResponse.json({
      user,
      followCounts,
      isFollowing,
      callSettings,
      messageRate,
    });
  } catch (error: any) {
    console.error('[PROFILE]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Check if it's a timeout error
    const isTimeout = error?.message?.includes('timeout');

    return NextResponse.json(
      {
        error: isTimeout
          ? 'Profile temporarily unavailable - please try again'
          : 'Failed to fetch profile',
        requestId,
      },
      {
        status: isTimeout ? 503 : 500,
        headers: { 'x-request-id': requestId }
      }
    );
  }
}
