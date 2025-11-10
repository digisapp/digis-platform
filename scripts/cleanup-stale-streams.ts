/**
 * Cleanup script to end all stale streams
 * Run with: npx tsx scripts/cleanup-stale-streams.ts
 */

import { db } from '@/lib/data/system';
import { streams, streamViewers } from '@/lib/data/system';
import { eq, and, sql, lt } from 'drizzle-orm';

async function cleanupStaleStreams() {
  console.log('🔍 Finding stale streams...');

  // Find all streams that are "live" but started more than 10 minutes ago
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const staleStreams = await db.query.streams.findMany({
    where: and(
      eq(streams.status, 'live'),
      lt(streams.startedAt, tenMinutesAgo)
    ),
  });

  console.log(`📊 Found ${staleStreams.length} stale streams to clean up`);

  if (staleStreams.length === 0) {
    console.log('✅ No stale streams found!');
    process.exit(0);
  }

  let cleaned = 0;
  for (const stream of staleStreams) {
    try {
      const endTime = new Date();
      const startTime = stream.startedAt || new Date();
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      await db
        .update(streams)
        .set({
          status: 'ended',
          endedAt: endTime,
          durationSeconds,
          updatedAt: new Date(),
        })
        .where(eq(streams.id, stream.id));

      // Clear viewers
      await db.delete(streamViewers).where(eq(streamViewers.streamId, stream.id));

      console.log(`✅ Ended stream: "${stream.title}" (${stream.id})`);
      cleaned++;
    } catch (error) {
      console.error(`❌ Failed to end stream ${stream.id}:`, error);
    }
  }

  console.log(`\n✨ Cleanup complete! Ended ${cleaned}/${staleStreams.length} streams`);
  process.exit(0);
}

// Run cleanup
cleanupStaleStreams().catch((error) => {
  console.error('💥 Cleanup script failed:', error);
  process.exit(1);
});
