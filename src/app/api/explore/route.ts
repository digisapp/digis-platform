import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq, ilike, or, desc, sql } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/explore - Browse and search creators
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Add timeout to prevent hanging
    const queryPromise = (async () => {
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
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 10000)
    );

    const creators = await Promise.race([queryPromise, timeoutPromise]);

    // Check if there are more results
    const hasMore = creators.length > limit;
    const results = hasMore ? creators.slice(0, limit) : creators;

    return NextResponse.json({
      creators: results,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error('Error fetching creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}
