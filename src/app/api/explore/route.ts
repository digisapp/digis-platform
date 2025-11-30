import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, follows, creatorCategories, creatorCategoryAssignments } from '@/lib/data/system';
import { eq, ilike, or, desc, sql, and, inArray, gt } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/explore - Browse creators with featured carousel and grid
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'All';
    const filter = searchParams.get('filter') || ''; // New filter parameter
    const featured = searchParams.get('featured') !== 'false'; // Default true
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get current user (optional - explore works for logged out users too)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    console.log('[EXPLORE]', {
      requestId,
      search,
      category,
      filter,
      featured,
      limit,
      offset,
      currentUserId: currentUserId || 'anonymous'
    });

    try {
      // Pre-fetch category ID if filtering by category (single query, more efficient)
      let categoryId: string | null = null;
      if (category && category !== 'All') {
        const categoryRecord = await db
          .select({ id: creatorCategories.id })
          .from(creatorCategories)
          .where(eq(creatorCategories.name, category))
          .limit(1);

        if (categoryRecord.length > 0) {
          categoryId = categoryRecord[0].id;
        }
      }

      // Fetch all data in parallel for performance
      const [featuredCreators, allCreators, categories] = await Promise.all([
        // Fetch featured creators for carousel (if requested)
        featured ? withTimeoutAndRetry(
          async () => {
            // Build featured query with JOIN for category filtering
            let featuredQuery = db
              .select({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                creatorCardImageUrl: users.creatorCardImageUrl,
                isCreatorVerified: users.isCreatorVerified,
                isOnline: users.isOnline,
                isTrending: users.isTrending,
                followerCount: users.followerCount,
                primaryCategory: users.primaryCategory,
                secondaryCategory: users.secondaryCategory,
              })
              .from(users)
              .$dynamic();

            // Build base conditions for featured - only show online creators
            const featuredConditions = [eq(users.role, 'creator'), eq(users.isOnline, true)];

            // Exclude current user from featured if logged in
            if (currentUserId) {
              featuredConditions.push(sql`${users.id} != ${currentUserId}`);
            }

            // Apply special filters to featured as well
            if (filter) {
              switch (filter) {
                case 'online':
                  featuredConditions.push(eq(users.isOnline, true));
                  break;
                case 'new':
                  const thirtyDaysAgoFeatured = new Date();
                  thirtyDaysAgoFeatured.setDate(thirtyDaysAgoFeatured.getDate() - 30);
                  featuredConditions.push(gt(users.createdAt, thirtyDaysAgoFeatured));
                  break;
                case 'trending':
                  featuredConditions.push(eq(users.isTrending, true));
                  break;
                case 'verified':
                  featuredConditions.push(eq(users.isCreatorVerified, true));
                  break;
                case 'available_for_calls':
                case 'live_now':
                  featuredConditions.push(eq(users.isOnline, true));
                  break;
              }
            }

            // Apply category filter with JOIN
            if (categoryId) {
              featuredQuery = featuredQuery
                .innerJoin(
                  creatorCategoryAssignments,
                  eq(users.id, creatorCategoryAssignments.creatorId)
                )
                .where(
                  and(
                    ...featuredConditions,
                    eq(creatorCategoryAssignments.categoryId, categoryId)
                  )
                );
            } else {
              featuredQuery = featuredQuery.where(and(...featuredConditions));
            }

            // Prioritize: trending > verified > new > others
            return await featuredQuery
              .orderBy(desc(users.isTrending), desc(users.isCreatorVerified), desc(users.createdAt))
              .limit(10);
          },
          {
            timeoutMs: 8000,
            retries: 1,
            tag: 'exploreFeatured'
          }
        ) : Promise.resolve([]),

        // Fetch all creators for grid
        withTimeoutAndRetry(
          async () => {
            let query = db
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
                secondaryCategory: users.secondaryCategory,
              })
              .from(users)
              .$dynamic();

            // Build base conditions
            const baseConditions = [eq(users.role, 'creator')];

            // Exclude current user from grid if logged in
            if (currentUserId) {
              baseConditions.push(sql`${users.id} != ${currentUserId}`);
            }

            // Apply special filters
            if (filter) {
              switch (filter) {
                case 'online':
                  baseConditions.push(eq(users.isOnline, true));
                  break;
                case 'new':
                  // Creators created in the last 30 days
                  const thirtyDaysAgoMain = new Date();
                  thirtyDaysAgoMain.setDate(thirtyDaysAgoMain.getDate() - 30);
                  baseConditions.push(gt(users.createdAt, thirtyDaysAgoMain));
                  break;
                case 'trending':
                  baseConditions.push(eq(users.isTrending, true));
                  break;
                case 'verified':
                  baseConditions.push(eq(users.isCreatorVerified, true));
                  break;
                case 'available_for_calls':
                  // This could be enhanced with a dedicated field
                  baseConditions.push(eq(users.isOnline, true));
                  break;
                case 'live_now':
                  // Assuming we add isLive field later
                  baseConditions.push(eq(users.isOnline, true));
                  break;
              }
            }

            // Apply category filter with JOIN
            if (categoryId) {
              query = query
                .innerJoin(
                  creatorCategoryAssignments,
                  eq(users.id, creatorCategoryAssignments.creatorId)
                )
                .where(
                  and(
                    ...baseConditions,
                    eq(creatorCategoryAssignments.categoryId, categoryId),
                    // Add search filter if provided
                    search ? or(
                      ilike(users.username, `%${search}%`),
                      ilike(users.displayName, `%${search}%`),
                      ilike(users.bio, `%${search}%`)
                    ) : undefined
                  )
                );
            } else {
              // No category filter, just search and role
              if (search) {
                baseConditions.push(
                  or(
                    ilike(users.username, `%${search}%`),
                    ilike(users.displayName, `%${search}%`),
                    ilike(users.bio, `%${search}%`)
                  )!
                );
              }
              query = query.where(and(...baseConditions));
            }

            // Order by online status first, then by follower count
            return await query
              .orderBy(desc(users.isOnline), desc(users.followerCount))
              .limit(limit + 1)
              .offset(offset);
          },
          {
            timeoutMs: 8000,
            retries: 1,
            tag: 'exploreGrid'
          }
        ),

        // Fetch available categories
        withTimeoutAndRetry(
          async () => {
            const cats = await db
              .select({
                id: creatorCategories.id,
                name: creatorCategories.name,
                slug: creatorCategories.slug,
              })
              .from(creatorCategories)
              .orderBy(creatorCategories.name);

            return ['All', ...cats.map(c => c.name)];
          },
          {
            timeoutMs: 5000,
            retries: 1,
            tag: 'exploreCategories'
          }
        ),
      ]);

      // Check if there are more results
      const hasMore = allCreators.length > limit;
      let gridCreators = hasMore ? allCreators.slice(0, limit) : allCreators;

      // If user is logged in, check which creators they're following
      if (currentUserId && gridCreators.length > 0) {
        const creatorIds = gridCreators.map(c => c.id);
        const followingStatus = await db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, currentUserId),
              inArray(follows.followingId, creatorIds)
            )
          );

        const followingSet = new Set(followingStatus.map(f => f.followingId));

        gridCreators = gridCreators.map(creator => ({
          ...creator,
          isFollowing: followingSet.has(creator.id),
        }));
      } else {
        gridCreators = gridCreators.map(creator => ({
          ...creator,
          isFollowing: false,
        }));
      }

      return NextResponse.json(
        success({
          featuredCreators: featuredCreators || [],
          creators: gridCreators,
          categories: categories || ['All'],
          pagination: {
            limit,
            offset,
            hasMore,
          },
        }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[EXPLORE]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        search,
      });

      return NextResponse.json(
        degraded(
          {
            featuredCreators: [],
            creators: [],
            categories: ['All'],
            pagination: { limit, offset, hasMore: false },
          },
          'Database temporarily unavailable - please try again in a moment',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[EXPLORE]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded(
        {
          featuredCreators: [],
          creators: [],
          categories: ['All'],
          pagination: { limit: 20, offset: 0, hasMore: false },
        },
        'Failed to fetch creators - please try again',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
