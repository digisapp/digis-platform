import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, follows, streams, shows, contentItems } from '@/lib/data/system';
import { eq, and, desc, sql, inArray, gte, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/feed - Get personalized feed for dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get list of creators the user follows
    const following = await db.query.follows.findMany({
      where: eq(follows.followerId, user.id),
      columns: { followingId: true },
    });

    const followedIds = following.map(f => f.followingId);
    const hasFollowing = followedIds.length > 0;

    // Fetch data in parallel
    const [
      liveFromFollowing,
      upcomingFromFollowing,
      recentContent,
      suggestedCreators,
    ] = await Promise.all([
      // Live streams from followed creators
      hasFollowing ? db.query.streams.findMany({
        where: and(
          inArray(streams.creatorId, followedIds),
          eq(streams.status, 'live')
        ),
        with: {
          creator: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [desc(streams.currentViewers)],
        limit: 10,
      }) : Promise.resolve([]),

      // Upcoming shows from followed creators
      hasFollowing ? db.query.shows.findMany({
        where: and(
          inArray(shows.creatorId, followedIds),
          eq(shows.status, 'scheduled'),
          gte(shows.scheduledStart, new Date())
        ),
        with: {
          creator: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [shows.scheduledStart],
        limit: 6,
      }) : Promise.resolve([]),

      // Recent content from followed creators (last 7 days)
      hasFollowing ? db.query.contentItems.findMany({
        where: and(
          inArray(contentItems.creatorId, followedIds),
          eq(contentItems.isPublished, true),
          gte(contentItems.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        ),
        with: {
          creator: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [desc(contentItems.createdAt)],
        limit: 12,
      }) : Promise.resolve([]),

      // Suggested creators (not followed, with profile pics, sorted by discovery score)
      db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        followerCount: users.followerCount,
        isOnline: users.isOnline,
        primaryCategory: users.primaryCategory,
        isCreatorVerified: users.isCreatorVerified,
        createdAt: users.createdAt,
      })
        .from(users)
        .where(
          and(
            eq(users.role, 'creator'),
            sql`${users.avatarUrl} IS NOT NULL AND ${users.avatarUrl} != ''`,
            // Exclude already followed creators and self
            hasFollowing
              ? sql`${users.id} NOT IN (${sql.join(followedIds.map(id => sql`${id}`), sql`, `)}) AND ${users.id} != ${user.id}`
              : sql`${users.id} != ${user.id}`
          )
        )
        .orderBy(
          desc(users.isOnline),
          desc(users.followerCount)
        )
        .limit(6),
    ]);

    // Get live stream status for suggested creators
    const suggestedCreatorIds = suggestedCreators.map(c => c.id);
    const liveStreams = suggestedCreatorIds.length > 0 ? await db.query.streams.findMany({
      where: and(
        inArray(streams.creatorId, suggestedCreatorIds),
        eq(streams.status, 'live')
      ),
      columns: { creatorId: true },
    }) : [];
    const liveCreatorIds = new Set(liveStreams.map(s => s.creatorId));

    // Add isLive to suggested creators
    const suggestedWithLive = suggestedCreators.map(creator => ({
      ...creator,
      isLive: liveCreatorIds.has(creator.id),
    }));

    // Check if user is following anyone
    const isNewUser = !hasFollowing;

    return NextResponse.json({
      isNewUser,
      followingCount: followedIds.length,
      liveFromFollowing: liveFromFollowing.map(stream => ({
        id: stream.id,
        title: stream.title,
        thumbnailUrl: stream.thumbnailUrl,
        viewerCount: stream.currentViewers,
        status: stream.status,
        creator: stream.creator,
      })),
      upcomingFromFollowing: upcomingFromFollowing.map(show => ({
        id: show.id,
        title: show.title,
        description: show.description,
        showType: show.showType,
        ticketPrice: show.ticketPrice,
        ticketsSold: show.ticketsSold,
        maxTickets: show.maxTickets,
        scheduledStart: show.scheduledStart,
        coverImageUrl: show.coverImageUrl,
        creator: show.creator,
      })),
      recentContent: recentContent.map(content => ({
        id: content.id,
        title: content.title,
        description: content.description,
        contentType: content.contentType,
        thumbnailUrl: content.thumbnailUrl,
        price: content.unlockPrice,
        isFree: content.isFree,
        createdAt: content.createdAt,
        creator: content.creator,
      })),
      suggestedCreators: suggestedWithLive,
    }, {
      headers: {
        // Private cache - personalized based on user's follows
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
