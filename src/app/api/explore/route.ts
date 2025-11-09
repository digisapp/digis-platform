import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq, ilike, or, desc, sql } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/explore - Browse and search creators
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[EXPLORE]', {
      requestId,
      search,
      category,
      limit,
      offset
    });

    // Fetch creators with timeout and retry
    try {
      const creators = await withTimeoutAndRetry(
        async () => {
          let query = db
            .select({
              id: users.id,
              username: users.username,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
              bannerUrl: users.bannerUrl,
              bio: users.bio,
              isCreatorVerified: users.isCreatorVerified,
              followerCount: users.followerCount,
              isOnline: users.isOnline,
            })
            .from(users)
            .where(eq(users.role, 'creator'))
            .$dynamic();

          // Add search filter if provided
          if (search) {
            query = query.where(
              or(
                ilike(users.username, `%${search}%`),
                ilike(users.displayName, `%${search}%`),
                ilike(users.bio, `%${search}%`)
              )
            );
          }

          // Order by online status first, then by follower count
          // Fetch one extra to determine if there are more results
          return await query
            .orderBy(desc(users.isOnline), desc(users.followerCount))
            .limit(limit + 1)
            .offset(offset);
        },
        {
          timeoutMs: 8000,
          retries: 2,
          tag: 'exploreCreators'
        }
      );

      // Check if there are more results
      const hasMore = creators.length > limit;
      const results = hasMore ? creators.slice(0, limit) : creators;

      return NextResponse.json(
        success({
          creators: results,
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

      // Return degraded response with empty creators list
      return NextResponse.json(
        degraded(
          {
            creators: [],
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
          creators: [],
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
