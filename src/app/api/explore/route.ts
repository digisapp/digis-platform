import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorCategories, streams } from '@/lib/data/system';
import { eq, ilike, or, desc, sql, and, gt } from 'drizzle-orm';
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

    // Start auth check but don't await it - we don't need it for the main query
    const authPromise = createClient()
      .then(s => s.auth.getUser())
      .then(r => r.data.user?.id)
      .catch(() => null);

    // Run essential queries in parallel with short timeouts
    const [liveCreatorIds, allCreators, categoryNames] = await Promise.all([
      // 1. Get live creator IDs (fast query)
      Promise.race([
        db.select({ creatorId: streams.creatorId }).from(streams).where(eq(streams.status, 'live')),
        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
      ]).catch(() => []),

      // 2. Main creators query - optimized with shorter timeout
      Promise.race([
        (async () => {
          // Simple direct query - no wrapper overhead
          const results = await db
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
            .where(eq(users.role, 'creator'))
            .orderBy(desc(users.isOnline), desc(users.followerCount))
            .limit(limit + 1)
            .offset(offset);

          // Apply client-side filters if needed
          let filtered = results;

          if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(c =>
              c.username?.toLowerCase().includes(searchLower) ||
              c.displayName?.toLowerCase().includes(searchLower)
            );
          }

          if (category && category !== 'All') {
            filtered = filtered.filter(c => c.primaryCategory === category);
          }

          if (filter === 'online') {
            filtered = filtered.filter(c => c.isOnline);
          }

          return filtered;
        })(),
        new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]).catch((err) => {
        console.error('[EXPLORE] Creators query failed:', err?.message);
        return [];
      }),

      // 3. Categories (fast query, can fail gracefully)
      Promise.race([
        db.select({ name: creatorCategories.name }).from(creatorCategories).orderBy(creatorCategories.name)
          .then(cats => ['All', ...cats.map(c => c.name)]),
        new Promise<string[]>((resolve) => setTimeout(() => resolve(['All']), 1500))
      ]).catch(() => ['All']),
    ]);

    // Get current user ID (don't block on this)
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
