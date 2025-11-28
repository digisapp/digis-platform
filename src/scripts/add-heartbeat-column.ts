import { db } from '../db';
import { sql } from 'drizzle-orm';

async function addHeartbeatColumn() {
  try {
    // Add lastHeartbeat column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE streams
      ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP
    `);
    console.log('Added last_heartbeat column to streams table');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('Column already exists');
    } else {
      throw error;
    }
  }

  process.exit(0);
}

addHeartbeatColumn().catch(console.error);
