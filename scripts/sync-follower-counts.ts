/**
 * Recalculate and sync follower/following counts from actual follows data
 * Usage: DATABASE_URL="..." npx tsx scripts/sync-follower-counts.ts [username]
 *
 * If username is provided, syncs only that user. Otherwise syncs all users.
 */

import { db } from '../src/db';
import { users, follows } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

const targetUsername = process.argv[2];

async function syncFollowerCounts() {
  try {
    let usersToSync;

    if (targetUsername) {
      console.log(`Syncing follower counts for: @${targetUsername}\n`);
      const user = await db.query.users.findFirst({
        where: eq(users.username, targetUsername.toLowerCase()),
      });

      if (!user) {
        console.error(`❌ User not found: @${targetUsername}`);
        process.exit(1);
      }

      usersToSync = [user];
    } else {
      console.log('Syncing follower counts for ALL users...\n');
      usersToSync = await db.query.users.findMany();
    }

    console.log(`Processing ${usersToSync.length} user(s)...\n`);

    let updated = 0;
    let unchanged = 0;

    for (const user of usersToSync) {
      // Count actual followers
      const followerRecords = await db.query.follows.findMany({
        where: eq(follows.followingId, user.id),
      });
      const actualFollowerCount = followerRecords.length;

      // Count actual following
      const followingRecords = await db.query.follows.findMany({
        where: eq(follows.followerId, user.id),
      });
      const actualFollowingCount = followingRecords.length;

      const storedFollowerCount = user.followerCount || 0;
      const storedFollowingCount = user.followingCount || 0;

      const needsUpdate =
        actualFollowerCount !== storedFollowerCount ||
        actualFollowingCount !== storedFollowingCount;

      if (needsUpdate) {
        await db.update(users)
          .set({
            followerCount: actualFollowerCount,
            followingCount: actualFollowingCount,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        console.log(`✅ Updated @${user.username || 'unknown'} (${user.email})`);
        console.log(`   Followers: ${storedFollowerCount} → ${actualFollowerCount}`);
        console.log(`   Following: ${storedFollowingCount} → ${actualFollowingCount}`);
        console.log();
        updated++;
      } else {
        unchanged++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Updated: ${updated} user(s)`);
    console.log(`   Unchanged: ${unchanged} user(s)`);
    console.log(`   Total: ${usersToSync.length} user(s)`);
    console.log('\n✅ Sync complete!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncFollowerCounts();
