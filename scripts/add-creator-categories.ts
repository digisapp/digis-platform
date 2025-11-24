import { db } from '../src/lib/data/system';
import { sql } from 'drizzle-orm';

async function addCreatorCategories() {
  try {
    console.log('Adding category columns to users table...');

    // Add the columns
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS primary_category TEXT,
      ADD COLUMN IF NOT EXISTS secondary_category TEXT;
    `);

    console.log('Creating indexes...');

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_primary_category_idx ON users(primary_category) WHERE role = 'creator';
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_secondary_category_idx ON users(secondary_category) WHERE role = 'creator';
    `);

    console.log('Adding comments...');

    // Add comments
    await db.execute(sql`
      COMMENT ON COLUMN users.primary_category IS 'Main content category for creators (e.g., Gaming, Music)';
    `);

    await db.execute(sql`
      COMMENT ON COLUMN users.secondary_category IS 'Optional secondary content category for creators';
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addCreatorCategories();
