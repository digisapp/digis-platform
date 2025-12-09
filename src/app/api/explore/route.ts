import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, follows, creatorCategories, streams } from '@/lib/data/system';
import { eq, ilike, or, desc, sql, and, inArray, gt } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded } from '@/types/api';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/explore - Browse creators with featured carousel and grid
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'All';
    const filter = searchParams.get('filter') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Cap at 50
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get current user ID (don't await - run in parallel)
    const authPromise = createClient().then(s => s.auth.getUser()).then(r => r.data.user?.id).catch(() => null);

    // Run ALL queries in parallel - no waterfall
    const [currentUserId, liveCreatorIds, allCreators, categoryNames] = await Promise.all([
      // 1. Auth (already started above)
      authPromise,

      // 2. Get live streaming creator IDs (fast query)
      withTimeoutAndRetry(
        () => db.select({ creatorId: streams.creatorId }).from(streams).where(eq(streams.status, 'live')),
        { timeoutMs: 2000, retries: 0, tag: 'exploreLive' }
      ).catch(() => []),

      // 3. Main creators query
      withTimeoutAndRetry(
        async () => {
          const baseConditions: any[] = [eq(users.role, 'creator')];

          // Apply search filter
          if (search) {
            baseConditions.push(
              or(
                ilike(users.username, `%${search}%`),
                ilike(users.displayName, `%${search}%`)
              )
            );
          }

          // Apply category filter
          if (category && category !== 'All') {
            baseConditions.push(
              or(
                eq(users.primaryCategory, category),
                eq(users.secondaryCategory, category)
              )
            );
          }

          // Apply special filters
          if (filter) {
            switch (filter) {
              case 'online':
                baseConditions.push(eq(users.isOnline, true));
                break;
              case 'new':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                baseConditions.push(gt(users.createdAt, thirtyDaysAgo));
                break;
              case 'trending':
                baseConditions.push(eq(users.isTrending, true));
                break;
              case 'verified':
                baseConditions.push(eq(users.isCreatorVerified, true));
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
            .where(and(...baseConditions))
            .orderBy(desc(users.isOnline), desc(users.followerCount))
            .limit(limit + 1)
            .offset(offset);
        },
        { timeoutMs: 3000, retries: 1, tag: 'exploreGrid' }
      ).catch(() => []),

      // 4. Categories (simple query)
      withTimeoutAndRetry(
        async () => {
          const cats = await db
            .select({ name: creatorCategories.name })
            .from(creatorCategories)
            .orderBy(creatorCategories.name);
          return ['All', ...cats.map(c => c.name)];
        },
        { timeoutMs: 2000, retries: 0, tag: 'exploreCategories' }
      ).catch(() => ['All']),
    ]);

    const liveCreatorIdSet = new Set(liveCreatorIds.map(s => s.creatorId));

    // Check if there are more results
    const hasMore = allCreators.length > limit;
    let gridCreators = hasMore ? allCreators.slice(0, limit) : allCreators;

    // Exclude current user and mark online status
    gridCreators = gridCreators
      .filter(c => c.id !== currentUserId)
      .map(creator => ({
        ...creator,
        isFollowing: false, // Skip follow check for speed - can load async on client
        isOnline: creator.isOnline || liveCreatorIdSet.has(creator.id),
      }));

    // Featured = first 10 online creators (already in the list, no extra query)
    const featuredCreators = gridCreators
      .filter(c => c.isOnline || c.isTrending || c.isCreatorVerified)
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        username: c.username,
        displayName: c.displayName,
        avatarUrl: c.creatorCardImageUrl || c.avatarUrl,
        isCreatorVerified: c.isCreatorVerified,
        isOnline: c.isOnline,
        isTrending: c.isTrending,
        followerCount: c.followerCount,
      }));

    return NextResponse.json(
      success({
        featuredCreators,
        creators: gridCreators,
        categories: categoryNames,
        pagination: { limit, offset, hasMore },
      }, requestId),
      { headers: { 'x-request-id': requestId } }
    );
  } catch (error: any) {
    console.error('[EXPLORE]', { requestId, error: error?.message });

    // Fail soft - return empty data
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
