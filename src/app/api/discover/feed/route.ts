import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { clips, clipLikes, cloudItems, users, follows } from '@/db/schema';
import { eq, desc, and, sql, isNotNull } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/discover/feed
 * Returns a ranked feed of clips and cloud content for the discover page.
 *
 * Query params:
 * - cursor: ISO date string for pagination (created/published at of last item)
 * - limit: number of items (default 20, max 50)
 * - type: 'all' | 'clips' | 'content' (default 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const type = searchParams.get('type') || 'all';

    // Get authenticated user (optional — affects personalization)
    let currentUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    } catch {
      // Not authenticated — that's fine
    }

    // Get IDs the user follows (for boosting followed creators)
    let followedIds: string[] = [];
    if (currentUserId) {
      const followRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUserId))
        .limit(500);
      followedIds = followRows.map(f => f.followingId);
    }

    // Get liked clip IDs for the current user (for UI state)
    let likedClipIds: Set<string> = new Set();
    if (currentUserId && (type === 'all' || type === 'clips')) {
      const likes = await db
        .select({ clipId: clipLikes.clipId })
        .from(clipLikes)
        .where(eq(clipLikes.userId, currentUserId))
        .limit(500);
      likedClipIds = new Set(likes.map(l => l.clipId));
    }

    const feedItems: FeedItem[] = [];

    // Fetch clips (free promotional content with video)
    if (type === 'all' || type === 'clips') {
      const cursorCondition = cursor
        ? sql`${clips.createdAt} < ${cursor}`
        : sql`true`;

      const clipResults = await db
        .select({
          id: clips.id,
          title: clips.title,
          description: clips.description,
          thumbnailUrl: clips.thumbnailUrl,
          videoUrl: clips.videoUrl,
          duration: clips.duration,
          viewCount: clips.viewCount,
          likeCount: clips.likeCount,
          shareCount: clips.shareCount,
          createdAt: clips.createdAt,
          creatorId: clips.creatorId,
          creatorUsername: users.username,
          creatorDisplayName: users.displayName,
          creatorAvatarUrl: users.avatarUrl,
          creatorIsVerified: users.isCreatorVerified,
        })
        .from(clips)
        .innerJoin(users, eq(clips.creatorId, users.id))
        .where(
          and(
            eq(clips.isPublic, true),
            isNotNull(clips.videoUrl),
            cursorCondition,
            eq(users.accountStatus, 'active'),
            eq(users.isHiddenFromDiscovery, false),
          )
        )
        .orderBy(desc(clips.createdAt))
        .limit(limit);

      for (const clip of clipResults) {
        feedItems.push({
          id: clip.id,
          type: 'clip',
          title: clip.title,
          description: clip.description,
          thumbnailUrl: clip.thumbnailUrl,
          videoUrl: clip.videoUrl,
          duration: clip.duration,
          viewCount: clip.viewCount,
          likeCount: clip.likeCount,
          shareCount: clip.shareCount,
          isLiked: likedClipIds.has(clip.id),
          isFree: true,
          priceCoins: null,
          createdAt: clip.createdAt.toISOString(),
          creator: {
            id: clip.creatorId,
            username: clip.creatorUsername,
            displayName: clip.creatorDisplayName,
            avatarUrl: clip.creatorAvatarUrl,
            isVerified: clip.creatorIsVerified || false,
          },
          engagementScore: calculateEngagement(
            clip.viewCount,
            clip.likeCount,
            clip.shareCount,
            clip.createdAt,
            followedIds.includes(clip.creatorId),
          ),
        });
      }
    }

    // Fetch cloud content (monetized — show preview/thumbnail only)
    if (type === 'all' || type === 'content') {
      const cursorCondition = cursor
        ? sql`${cloudItems.publishedAt} < ${cursor}`
        : sql`true`;

      const contentResults = await db
        .select({
          id: cloudItems.id,
          type: cloudItems.type,
          previewUrl: cloudItems.previewUrl,
          thumbnailUrl: cloudItems.thumbnailUrl,
          priceCoins: cloudItems.priceCoins,
          likeCount: cloudItems.likeCount,
          durationSeconds: cloudItems.durationSeconds,
          publishedAt: cloudItems.publishedAt,
          creatorId: cloudItems.creatorId,
          creatorUsername: users.username,
          creatorDisplayName: users.displayName,
          creatorAvatarUrl: users.avatarUrl,
          creatorIsVerified: users.isCreatorVerified,
        })
        .from(cloudItems)
        .innerJoin(users, eq(cloudItems.creatorId, users.id))
        .where(
          and(
            eq(cloudItems.status, 'live'),
            isNotNull(cloudItems.publishedAt),
            cursorCondition,
            eq(users.accountStatus, 'active'),
            eq(users.isHiddenFromDiscovery, false),
          )
        )
        .orderBy(desc(cloudItems.publishedAt))
        .limit(limit);

      for (const item of contentResults) {
        feedItems.push({
          id: item.id,
          type: item.type === 'video' ? 'cloud_video' : 'cloud_photo',
          title: null,
          description: null,
          thumbnailUrl: item.previewUrl || item.thumbnailUrl,
          videoUrl: null, // Never expose full video URL in feed — requires purchase
          duration: item.durationSeconds,
          viewCount: 0,
          likeCount: item.likeCount,
          shareCount: 0,
          isLiked: false,
          isFree: item.priceCoins === null || item.priceCoins === 0,
          priceCoins: item.priceCoins,
          createdAt: item.publishedAt?.toISOString() || '',
          creator: {
            id: item.creatorId,
            username: item.creatorUsername,
            displayName: item.creatorDisplayName,
            avatarUrl: item.creatorAvatarUrl,
            isVerified: item.creatorIsVerified || false,
          },
          engagementScore: calculateEngagement(
            0,
            item.likeCount,
            0,
            item.publishedAt || new Date(),
            followedIds.includes(item.creatorId),
          ),
        });
      }
    }

    // Sort by engagement score (descending)
    feedItems.sort((a, b) => b.engagementScore - a.engagementScore);

    // Trim to requested limit
    const trimmed = feedItems.slice(0, limit);

    // Calculate next cursor
    const nextCursor = trimmed.length === limit
      ? trimmed[trimmed.length - 1].createdAt
      : null;

    return NextResponse.json(
      { items: trimmed, nextCursor },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[Discover Feed] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}

interface FeedItem {
  id: string;
  type: 'clip' | 'cloud_video' | 'cloud_photo';
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  duration: number | null;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  isLiked: boolean;
  isFree: boolean;
  priceCoins: number | null;
  createdAt: string;
  creator: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  engagementScore: number;
}

/**
 * Calculate engagement score for feed ranking.
 * Higher score = shown first.
 */
function calculateEngagement(
  views: number,
  likes: number,
  shares: number,
  createdAt: Date,
  isFollowed: boolean,
): number {
  // Weighted engagement (shares worth more than likes, likes worth more than views)
  const engagement = (views * 1) + (likes * 5) + (shares * 10);

  // Time decay: newer content gets a boost (halves every 24 hours)
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const recencyBoost = Math.max(0, 1000 - (hoursOld * 20));

  // Followed creator boost
  const followBoost = isFollowed ? 200 : 0;

  return engagement + recencyBoost + followBoost;
}
