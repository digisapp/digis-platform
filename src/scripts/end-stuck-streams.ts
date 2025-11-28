import { db } from '../db';
import { streams } from '../db/schema';
import { eq } from 'drizzle-orm';

async function endStuckStreams() {
  // End all stuck 'live' streams
  const result = await db.update(streams)
    .set({
      status: 'ended',
      endedAt: new Date()
    })
    .where(eq(streams.status, 'live'))
    .returning({ id: streams.id, title: streams.title });

  console.log('Ended stuck streams:', result.length);
  console.table(result);

  process.exit(0);
}

endStuckStreams().catch(console.error);
