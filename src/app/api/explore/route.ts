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
    const creators = await query
      .orderBy(desc(users.isOnline), desc(users.followerCount))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'creator'));

    return NextResponse.json({
      creators,
      pagination: {
        total: totalCount[0]?.count || 0,
        limit,
        offset,
        hasMore: offset + limit < (totalCount[0]?.count || 0),
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
