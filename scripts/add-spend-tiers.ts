/**
 * Add lifetime spending and tier tracking to users table
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or DIRECT_DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function addSpendTiers() {
  try {
    console.log('Adding spend tier enum and columns...');

    // Create spend_tier enum if it doesn't exist
    await sql`
      DO $$ BEGIN
        CREATE TYPE spend_tier AS ENUM ('none', 'bronze', 'silver', 'gold', 'platinum', 'diamond');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✓ Created spend_tier enum');

    // Add lifetime_spending column
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS lifetime_spending INTEGER NOT NULL DEFAULT 0;
    `;
    console.log('✓ Added lifetime_spending column');

    // Add spend_tier column
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS spend_tier spend_tier NOT NULL DEFAULT 'none';
    `;
    console.log('✓ Added spend_tier column');

    // Create index on lifetime_spending for leaderboard queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_lifetime_spending
      ON users(lifetime_spending DESC);
    `;
    console.log('✓ Created lifetime_spending index');

    console.log('\n✅ Spend tier system successfully added!');

  } catch (error) {
    console.error('❌ Error adding spend tiers:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

addSpendTiers();
