import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, follows } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/streams/suggested-creators
 * Returns suggested creators to show when no streams are live
 * - Followed creators (sorted by online status)
 * - Top creators (sorted by follower count, excluding followed)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let followedCreators: any[] = [];
    let topCreators: any[] = [];

    if (user) {
      // Get creators the user follows
      followedCreators = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isCreatorVerified: users.isCreatorVerified,
          isOnline: users.isOnline,
          primaryCategory: users.primaryCategory,
          followerCount: users.followerCount,
        })
        .from(follows)
        .innerJoin(users, eq(follows.followingId, users.id))
        .where(
          and(
            eq(follows.followerId, user.id),
            eq(users.role, 'creator')
          )
        )
        .orderBy(desc(users.isOnline), desc(users.followerCount))
        .limit(8);

      // Get top creators (excluding followed)
      topCreators = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isCreatorVerified: users.isCreatorVerified,
          isOnline: users.isOnline,
          primaryCategory: users.primaryCategory,
          followerCount: users.followerCount,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'creator'),
            eq(users.accountStatus, 'active'),
            eq(users.isHiddenFromDiscovery, false), // Hide creators marked as hidden
            sql`${users.id} != ${user.id}`,
            sql`${users.id} NOT IN (
              SELECT following_id FROM follows WHERE follower_id = ${user.id}
            )`
          )
        )
        .orderBy(desc(users.isOnline), desc(users.followerCount))
        .limit(8);
    } else {
      // For logged out users, just show top creators
      topCreators = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isCreatorVerified: users.isCreatorVerified,
          isOnline: users.isOnline,
          primaryCategory: users.primaryCategory,
          followerCount: users.followerCount,
        })
        .from(users)
        .where(
          and(
            eq(users.role, 'creator'),
            eq(users.accountStatus, 'active'),
            eq(users.isHiddenFromDiscovery, false) // Hide creators marked as hidden
          )
        )
        .orderBy(desc(users.isOnline), desc(users.followerCount))
        .limit(12);
    }

    return NextResponse.json({
      followedCreators,
      topCreators,
    });
  } catch (error) {
    console.error('Error fetching suggested creators:', error);
    return NextResponse.json({
      followedCreators: [],
      topCreators: [],
    });
  }
}
