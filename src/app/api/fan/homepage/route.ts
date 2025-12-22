import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, streams, follows } from '@/db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/fan/homepage
 * Aggregated data for the fan homepage dashboard
 * Returns: live streams, followed creators, discover creators
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all queries in parallel for performance
    const [
      liveStreamsResult,
      followedCreatorsResult,
      discoverCreatorsResult,
    ] = await Promise.all([
      // 1. Live Streams (max 6)
      db
        .select({
          id: streams.id,
          title: streams.title,
          thumbnailUrl: streams.thumbnailUrl,
          currentViewers: streams.currentViewers,
          startedAt: streams.startedAt,
          category: streams.category,
          creator: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            isCreatorVerified: users.isCreatorVerified,
          },
        })
        .from(streams)
        .innerJoin(users, eq(streams.creatorId, users.id))
        .where(eq(streams.status, 'live'))
        .orderBy(desc(streams.currentViewers))
        .limit(6),

      // 2. Followed Creators (max 12)
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isCreatorVerified: users.isCreatorVerified,
          isOnline: users.isOnline,
          primaryCategory: users.primaryCategory,
        })
        .from(follows)
        .innerJoin(users, eq(follows.followingId, users.id))
        .where(eq(follows.followerId, user.id))
        .orderBy(desc(users.isOnline), desc(users.lastSeenAt))
        .limit(12),

      // 3. Discover Creators (max 8, excluding already followed)
      db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isCreatorVerified: users.isCreatorVerified,
          isOnline: users.isOnline,
          isTrending: users.isTrending,
          primaryCategory: users.primaryCategory,
          followerCount: users.followerCount,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'creator'),
            eq(users.accountStatus, 'active'),
            // Exclude self
            sql`${users.id} != ${user.id}`,
            // Exclude already followed creators
            sql`${users.id} NOT IN (
              SELECT following_id FROM follows WHERE follower_id = ${user.id}
            )`
          )
        )
        .orderBy(
          // Discovery score: prioritize live > online > verified > trending > new > followers
          sql`
            CASE WHEN ${users.isOnline} = true THEN 500 ELSE 0 END +
            CASE WHEN ${users.isCreatorVerified} = true THEN 100 ELSE 0 END +
            CASE WHEN ${users.isTrending} = true THEN 200 ELSE 0 END +
            CASE WHEN ${users.createdAt} > NOW() - INTERVAL '30 days' THEN 150 ELSE 0 END +
            LEAST(LOG(GREATEST(${users.followerCount}, 1)) * 50, 300)
          DESC`
        )
        .limit(8),
    ]);

    // Check which followed creators are currently live
    const followedCreatorIds = followedCreatorsResult.map((c) => c.id);
    let liveFollowedIds: string[] = [];

    if (followedCreatorIds.length > 0) {
      const liveFollowed = await db
        .select({ creatorId: streams.creatorId })
        .from(streams)
        .where(
          and(
            eq(streams.status, 'live'),
            inArray(streams.creatorId, followedCreatorIds)
          )
        );
      liveFollowedIds = liveFollowed.map((s) => s.creatorId);
    }

    // Add isLive flag to followed creators
    const followedCreatorsWithLive = followedCreatorsResult.map((creator) => ({
      ...creator,
      isLive: liveFollowedIds.includes(creator.id),
    }));

    // Sort followed creators: live first, then online, then others
    followedCreatorsWithLive.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });

    return NextResponse.json({
      liveStreams: liveStreamsResult,
      followedCreators: followedCreatorsWithLive,
      discoverCreators: discoverCreatorsResult,
      counts: {
        liveStreams: liveStreamsResult.length,
        followedCreators: followedCreatorsResult.length,
        discoverCreators: discoverCreatorsResult.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching fan homepage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data' },
      { status: 500 }
    );
  }
}
