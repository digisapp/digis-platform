import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorGoals, contentItems } from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';
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
      { timeoutMs: 5000, retries: 1, tag: 'profileFetch' }
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

    // Helper for timeout with fallback
    const withTimeout = <T>(promise: Promise<T>, fallback: T, ms = 2000): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
      ]);

    // Batch all queries in parallel with timeouts - non-essential queries fail gracefully
    const [followCounts, isFollowing, creatorSettings, goals, content] = await Promise.all([
      // 1. Get follow counts (essential - use cached fallback)
      withTimeout(
        FollowService.getFollowCounts(user.id),
        { followers: user.followerCount || 0, following: user.followingCount || 0 }
      ),

      // 2. Check if current user is following
      currentUser && currentUser.id !== user.id
        ? withTimeout(FollowService.isFollowing(currentUser.id, user.id), false)
        : Promise.resolve(false),

      // 3. Get creator settings if applicable
      user.role === 'creator'
        ? withTimeout(CallService.getCreatorSettings(user.id).catch(() => null), null)
        : Promise.resolve(null),

      // 4. Get goals if creator (non-essential)
      user.role === 'creator'
        ? withTimeout(
            db.query.creatorGoals.findMany({
              where: and(
                eq(creatorGoals.creatorId, user.id),
                eq(creatorGoals.isActive, true)
              ),
              orderBy: [desc(creatorGoals.displayOrder), desc(creatorGoals.createdAt)],
            }).catch(() => []),
            []
          )
        : Promise.resolve([]),

      // 5. Get content preview if creator (non-essential)
      user.role === 'creator'
        ? withTimeout(
            db.query.contentItems.findMany({
              where: and(
                eq(contentItems.creatorId, user.id),
                eq(contentItems.isPublished, true)
              ),
              orderBy: [desc(contentItems.createdAt)],
              limit: 20,
            }).catch(() => []),
            []
          )
        : Promise.resolve([]),
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
      goals,
      content,
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
