import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set');
}

async function addHangoutCategory() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('🔄 Adding hangout category to show_type enum...');

    // Add hangout enum value
    await db.execute(sql`
      ALTER TYPE show_type ADD VALUE IF NOT EXISTS 'hangout';
    `);

    console.log('✅ Hangout category added successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addHangoutCategory();
