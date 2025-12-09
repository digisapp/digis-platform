import { db } from '@/lib/data/system';
import { follows, users } from '@/lib/data/system';
import { and, eq, or, desc, sql } from 'drizzle-orm';

export class FollowService {
  // Follow a user
  static async followUser(followerId: string, followingId: string) {
    // Don't allow self-follow
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following
    const existing = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ),
    });

    if (existing) {
      throw new Error('Already following this user');
    }

    // Create follow relationship
    await db.insert(follows).values({
      followerId,
      followingId,
    });

    // Update follower counts
    await Promise.all([
      db.update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, followerId)),
      db.update(users)
        .set({ followerCount: sql`${users.followerCount} + 1` })
        .where(eq(users.id, followingId)),
    ]);

    return { success: true };
  }

  // Unfollow a user
  static async unfollowUser(followerId: string, followingId: string) {
    // Find and delete follow relationship
    const deleted = await db.delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      throw new Error('Not following this user');
    }

    // Update follower counts
    await Promise.all([
      db.update(users)
        .set({ followingCount: sql`GREATEST(${users.followingCount} - 1, 0)` })
        .where(eq(users.id, followerId)),
      db.update(users)
        .set({ followerCount: sql`GREATEST(${users.followerCount} - 1, 0)` })
        .where(eq(users.id, followingId)),
    ]);

    return { success: true };
  }

  // Check if user is following another user
  static async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ),
    });

    return !!follow;
  }

  // Get followers of a user
  static async getFollowers(userId: string, limit = 50, offset = 0) {
    const followers = await db.query.follows.findMany({
      where: eq(follows.followingId, userId),
      limit,
      offset,
      with: {
        follower: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            isCreatorVerified: true,
            followerCount: true,
          },
        },
      },
      orderBy: [desc(follows.createdAt)],
    });

    return followers.map(f => f.follower);
  }

  // Get users that a user is following
  static async getFollowing(userId: string, limit = 50, offset = 0) {
    const following = await db.query.follows.findMany({
      where: eq(follows.followerId, userId),
      limit,
      offset,
      with: {
        following: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            isCreatorVerified: true,
            followerCount: true,
          },
        },
      },
      orderBy: [desc(follows.createdAt)],
    });

    return following.map(f => f.following);
  }

  // Get follow counts for a user (calculated from actual follows table for accuracy)
  static async getFollowCounts(userId: string) {
    // Count actual follows from the follows table instead of relying on cached counts
    const [followerResult, followingResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, userId)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, userId)),
    ]);

    const followers = followerResult[0]?.count || 0;
    const following = followingResult[0]?.count || 0;

    // Optionally sync the cached counts if they're out of sync
    // This helps keep the users table in sync for other queries
    db.update(users)
      .set({ followerCount: followers, followingCount: following })
      .where(eq(users.id, userId))
      .catch(() => {}); // Fire and forget - don't block the response

    return {
      followers,
      following,
    };
  }

  // Get mutual follows (users that follow each other)
  static async getMutualFollows(userId: string, limit = 50) {
    const mutuals = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        isCreatorVerified: users.isCreatorVerified,
        followerCount: users.followerCount,
      })
      .from(follows)
      .innerJoin(
        sql`follows f2`,
        and(
          sql`follows.following_id = f2.follower_id`,
          sql`follows.follower_id = f2.following_id`
        )
      )
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId))
      .limit(limit);

    return mutuals;
  }
}
