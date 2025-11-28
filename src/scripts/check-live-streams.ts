import { db } from '../db';
import { streams, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkLiveStreams() {
  // Check for any 'live' streams
  const liveStreams = await db.select({
    id: streams.id,
    title: streams.title,
    status: streams.status,
    creatorId: streams.creatorId,
    startedAt: streams.startedAt,
    endedAt: streams.endedAt,
  }).from(streams).where(eq(streams.status, 'live'));

  console.log('Live streams found:', liveStreams.length);
  console.table(liveStreams);

  // Get creator info for these streams
  for (const stream of liveStreams) {
    const user = await db.select({ username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, stream.creatorId))
      .limit(1);
    console.log(`Stream ${stream.id} by:`, user[0]?.displayName || user[0]?.username);
  }

  process.exit(0);
}

checkLiveStreams().catch(console.error);
