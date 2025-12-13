import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorCategories, streams, contentItems } from '@/lib/data/system';
import { eq, ilike, or, desc, sql, and, gte } from 'drizzle-orm';
import { success, degraded } from '@/types/api';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Calculate discovery score for ranking creators
function calculateDiscoveryScore(creator: {
  isLive: boolean;
  isOnline: boolean;
  isCreatorVerified: boolean;
  followerCount: number;
  isNewCreator: boolean;
  recentStreamCount: number;
  recentContentCount: number;
}): number {
  let score = 0;

  // Live status - highest priority (1000 points)
  if (creator.isLive) score += 1000;

  // Online status (500 points)
  if (creator.isOnline) score += 500;

  // Verified creators (100 points)
  if (creator.isCreatorVerified) score += 100;

  // New creator boost - help new creators get discovered (150 points)
  if (creator.isNewCreator) score += 150;

  // Recent activity - streamed in last 7 days (200 points)
  if (creator.recentStreamCount > 0) score += 200;

  // Recent content - posted in last 7 days (100 points)
  if (creator.recentContentCount > 0) score += 100;

  // Follower count - normalized (max 300 points)
  // Log scale to prevent mega-creators from dominating
  // 10 followers = ~69 points, 100 = ~138, 1000 = ~207, 10000 = ~276
  if (creator.followerCount > 0) {
    score += Math.min(300, Math.log10(creator.followerCount + 1) * 69);
  }

  return score;
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const filter = searchParams.get('filter') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Date thresholds
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Start auth check but don't block on it
    const authPromise = createClient()
      .then(s => s.auth.getUser())
      .then(r => r.data.user?.id)
      .catch(() => null);

    // Run queries in parallel
    const [liveStreams, allCreators, categoryNames, recentStreams, recentContent] = await Promise.all([
      // 1. Live streams with creator IDs - can fail gracefully
      Promise.race([
        db.select({ creatorId: streams.creatorId, streamId: streams.id }).from(streams).where(eq(streams.status, 'live')),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
      ]).catch(() => []),

      // 2. Main creators query - with timeout
      Promise.race([
        (async () => {
          try {
            // Build WHERE conditions
            // Only show creators with profile pictures (better explore experience)
            const conditions = [
              eq(users.role, 'creator'),
              sql`${users.avatarUrl} IS NOT NULL AND ${users.avatarUrl} != ''`,
            ];

            // Add search filter in SQL (not JS)
            if (search) {
              conditions.push(
                or(
                  ilike(users.username, `%${search}%`),
                  ilike(users.displayName, `%${search}%`)
                )!
              );
            }

            // Add online filter in SQL
            if (filter === 'online') {
              conditions.push(eq(users.isOnline, true));
            }

            // Add new creator filter - joined within last 30 days
            if (filter === 'new') {
              conditions.push(sql`${users.createdAt} >= ${thirtyDaysAgo.toISOString()}`);
            }

            // Use subquery for accurate follower count
            const followerCountSubquery = sql<number>`(
              SELECT COUNT(*)::int FROM follows WHERE follows.following_id = ${users.id}
            )`.as('actual_follower_count');

            // Fetch more than needed since we'll sort in JS
            const results = await db
              .select({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
                isCreatorVerified: users.isCreatorVerified,
                followerCount: followerCountSubquery,
                isOnline: users.isOnline,
                createdAt: users.createdAt,
              })
              .from(users)
              .where(and(...conditions))
              .limit(500); // Fetch more for better scoring, then paginate in JS

            return results;
          } catch (err: any) {
            console.error('[EXPLORE] Creators query failed:', err?.message);
            return [];
          }
        })(),
        new Promise<any[]>((resolve) => setTimeout(() => {
          console.warn('[EXPLORE] Query timeout - returning empty');
          resolve([]);
        }, 5000))
      ]).catch(() => []),

      // 3. Categories - can fail gracefully
      Promise.race([
        db.select({ name: creatorCategories.name }).from(creatorCategories).orderBy(creatorCategories.name)
          .then(cats => ['All', ...cats.map(c => c.name)]),
        new Promise<string[]>((resolve) => setTimeout(() => resolve(['All']), 2000))
      ]).catch(() => ['All']),

      // 4. Recent streams (last 7 days) - for activity scoring
      Promise.race([
        db.select({ creatorId: streams.creatorId })
          .from(streams)
          .where(gte(streams.startedAt, sevenDaysAgo)),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
      ]).catch(() => []),

      // 5. Recent content (last 7 days) - for activity scoring
      Promise.race([
        db.select({ creatorId: contentItems.creatorId })
          .from(contentItems)
          .where(and(
            eq(contentItems.isPublished, true),
            gte(contentItems.createdAt, sevenDaysAgo)
          )),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
      ]).catch(() => []),
    ]);

    // Get current user ID (500ms max wait)
    const currentUserId = await Promise.race([
      authPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
    ]);

    // Build lookup maps for activity
    const liveCreatorIdSet = new Set(liveStreams.map(s => s.creatorId));
    const liveStreamIdMap = new Map(liveStreams.map(s => [s.creatorId, s.streamId]));

    const recentStreamCounts = new Map<string, number>();
    recentStreams.forEach(s => {
      recentStreamCounts.set(s.creatorId, (recentStreamCounts.get(s.creatorId) || 0) + 1);
    });

    const recentContentCounts = new Map<string, number>();
    recentContent.forEach(c => {
      recentContentCounts.set(c.creatorId, (recentContentCounts.get(c.creatorId) || 0) + 1);
    });

    // Transform creators with discovery score
    let creators = allCreators
      .filter(c => c.id !== currentUserId)
      .map(creator => {
        const isLive = liveCreatorIdSet.has(creator.id);
        const liveStreamId = liveStreamIdMap.get(creator.id) || null;
        const isNewCreator = creator.createdAt && new Date(creator.createdAt) >= thirtyDaysAgo;

        const creatorData = {
          ...creator,
          isFollowing: false,
          isOnline: creator.isOnline || isLive,
          isLive,
          liveStreamId,
        };

        // Calculate discovery score
        const discoveryScore = calculateDiscoveryScore({
          isLive,
          isOnline: creatorData.isOnline,
          isCreatorVerified: creator.isCreatorVerified || false,
          followerCount: creator.followerCount || 0,
          isNewCreator: isNewCreator || false,
          recentStreamCount: recentStreamCounts.get(creator.id) || 0,
          recentContentCount: recentContentCounts.get(creator.id) || 0,
        });

        return { ...creatorData, discoveryScore };
      });

    // Sort by discovery score (highest first)
    creators.sort((a, b) => b.discoveryScore - a.discoveryScore);

    // Apply live filter after we know who's live
    if (filter === 'live') {
      creators = creators.filter(c => c.isLive);
    }

    // Pagination in JS since we sorted in JS
    const hasMore = creators.length > offset + limit;
    const paginatedCreators = creators.slice(offset, offset + limit).map(({ discoveryScore, ...c }) => c);

    return NextResponse.json(
      success({
        featuredCreators: [], // No longer used
        creators: paginatedCreators,
        categories: categoryNames,
        pagination: { limit, offset, hasMore },
      }, requestId),
      { headers: { 'x-request-id': requestId } }
    );
  } catch (error: any) {
    console.error('[EXPLORE]', { requestId, error: error?.message });

    return NextResponse.json(
      degraded(
        {
          featuredCreators: [],
          creators: [],
          categories: ['All'],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
        'temporarily_unavailable',
        'timeout',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
