import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set');
}

async function migrateShowTypes() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('🔄 Migrating show_type enum...');

    // Step 1: Add new enum values
    console.log('Adding new enum values...');
    await db.execute(sql`
      ALTER TYPE show_type ADD VALUE IF NOT EXISTS 'class';
      ALTER TYPE show_type ADD VALUE IF NOT EXISTS 'gaming';
      ALTER TYPE show_type ADD VALUE IF NOT EXISTS 'other';
    `);

    // Step 2: Migrate existing values to new schema
    console.log('Migrating existing show types...');
    await db.execute(sql`
      -- Map old live_show to performance
      UPDATE shows
      SET show_type = 'performance'
      WHERE show_type = 'live_show';

      -- meetgreet stays as qna (close enough)
      UPDATE shows
      SET show_type = 'qna'
      WHERE show_type = 'meetgreet';
    `);

    console.log('✅ Show type enum migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateShowTypes();
