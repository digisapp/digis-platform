import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorCategories, streams } from '@/lib/data/system';
import { eq, ilike, or, desc, sql, and, gt } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded } from '@/types/api';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'All';
    const filter = searchParams.get('filter') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Run queries in parallel
    const [currentUserId, liveCreatorIds, allCreators, categoryNames] = await Promise.all([
      // 1. Auth
      createClient()
        .then(s => s.auth.getUser())
        .then(r => r.data.user?.id)
        .catch(() => null),

      // 2. Get live creator IDs
      withTimeoutAndRetry(
        () => db.select({ creatorId: streams.creatorId }).from(streams).where(eq(streams.status, 'live')),
        { timeoutMs: 2000, retries: 0, tag: 'exploreLive' }
      ).catch(() => []),

      // 3. Main creators query (no live filter here - applied after)
      withTimeoutAndRetry(
        async () => {
          const conditions: any[] = [eq(users.role, 'creator')];

          if (search) {
            conditions.push(
              or(
                ilike(users.username, `%${search}%`),
                ilike(users.displayName, `%${search}%`)
              )
            );
          }

          if (category && category !== 'All') {
            conditions.push(
              or(
                eq(users.primaryCategory, category),
                eq(users.secondaryCategory, category)
              )
            );
          }

          // Apply non-live filters
          if (filter && filter !== 'live') {
            switch (filter) {
              case 'online':
                conditions.push(eq(users.isOnline, true));
                break;
              case 'new':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                conditions.push(gt(users.createdAt, thirtyDaysAgo));
                break;
            }
          }

          return db
            .select({
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
              bannerUrl: users.bannerUrl,
              creatorCardImageUrl: users.creatorCardImageUrl,
              bio: users.bio,
              isCreatorVerified: users.isCreatorVerified,
              isTrending: users.isTrending,
              followerCount: users.followerCount,
              isOnline: users.isOnline,
              primaryCategory: users.primaryCategory,
            })
            .from(users)
            .where(and(...conditions))
            .orderBy(desc(users.isOnline), desc(users.followerCount))
            .limit(filter === 'live' ? 100 : limit + 1) // Get more if live filter (will filter after)
            .offset(filter === 'live' ? 0 : offset);
        },
        { timeoutMs: 3000, retries: 1, tag: 'exploreGrid' }
      ).catch((err) => {
        console.error('[EXPLORE] Creators query failed:', err?.message);
        return [];
      }),

      // 4. Categories
      withTimeoutAndRetry(
        async () => {
          const cats = await db
            .select({ name: creatorCategories.name })
            .from(creatorCategories)
            .orderBy(creatorCategories.name);
          return ['All', ...cats.map(c => c.name)];
        },
        { timeoutMs: 2000, retries: 0, tag: 'exploreCategories' }
      ).catch((err) => {
        console.error('[EXPLORE] Categories query failed:', err?.message);
        return ['All'];
      }),
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

    // Pagination
    const hasMore = filter === 'live' ? false : creators.length > limit;
    const paginatedCreators = hasMore ? creators.slice(0, limit) : creators;

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
