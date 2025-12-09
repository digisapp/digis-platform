import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorCategories, streams, follows } from '@/lib/data/system';
import { eq, ilike, or, desc, sql, and } from 'drizzle-orm';
import { success, degraded } from '@/types/api';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const filter = searchParams.get('filter') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Start auth check but don't block on it
    const authPromise = createClient()
      .then(s => s.auth.getUser())
      .then(r => r.data.user?.id)
      .catch(() => null);

    // Run queries in parallel
    const [liveCreatorIds, allCreators, categoryNames] = await Promise.all([
      // 1. Live creator IDs - can fail gracefully
      Promise.race([
        db.select({ creatorId: streams.creatorId }).from(streams).where(eq(streams.status, 'live')),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
      ]).catch(() => []),

      // 2. Main creators query - with timeout
      Promise.race([
        (async () => {
          try {
            // Build WHERE conditions
            const conditions = [eq(users.role, 'creator')];

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

            // Use subquery for accurate follower count, but order by cached column for speed
            const followerCountSubquery = sql<number>`(
              SELECT COUNT(*)::int FROM follows WHERE follows.following_id = ${users.id}
            )`.as('actual_follower_count');

            const results = await db
              .select({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
                creatorCardImageUrl: users.creatorCardImageUrl,
                isCreatorVerified: users.isCreatorVerified,
                followerCount: followerCountSubquery,
                isOnline: users.isOnline,
                createdAt: users.createdAt,
              })
              .from(users)
              .where(and(...conditions))
              .orderBy(desc(users.isOnline), desc(users.followerCount)) // Use cached column for ORDER BY (faster)
              .limit(limit + 1)
              .offset(offset);

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
    ]);

    // Get current user ID (500ms max wait)
    const currentUserId = await Promise.race([
      authPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
    ]);

    const liveCreatorIdSet = new Set(liveCreatorIds.map(s => s.creatorId));

    // Transform creators with live/online status
    let creators = allCreators
      .filter(c => c.id !== currentUserId)
      .map(creator => ({
        ...creator,
        isFollowing: false,
        isOnline: creator.isOnline || liveCreatorIdSet.has(creator.id),
        isLive: liveCreatorIdSet.has(creator.id),
      }));

    // Apply live filter after we know who's live
    if (filter === 'live') {
      creators = creators.filter(c => c.isLive);
    }

    // Pagination - check if we got more than limit from DB (before JS filtering removed some)
    // allCreators had limit+1 fetched, so if we got that many, there's likely more
    const hasMore = filter === 'live' ? false : allCreators.length > limit;
    const paginatedCreators = creators.length > limit ? creators.slice(0, limit) : creators;

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
