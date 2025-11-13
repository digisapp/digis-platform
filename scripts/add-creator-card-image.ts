import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const connectionString = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
  .replace('postgres://', 'postgresql://');

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL not found');
  console.error('Set it with: DATABASE_URL="..." npx tsx scripts/add-creator-card-image.ts');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
  max: 1
});

async function addCreatorCardImageColumn() {
  console.log('🔧 Adding creator_card_image_url column to users table...\n');

  try {
    // Add the column
    console.log('⏳ Adding column...');
    await sql.unsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS creator_card_image_url TEXT;
    `);
    console.log('✅ Column added successfully!\n');

    // Add comment
    console.log('⏳ Adding column comment...');
    await sql.unsafe(`
      COMMENT ON COLUMN users.creator_card_image_url IS '16:9 aspect ratio image for creator card display on explore page';
    `);
    console.log('✅ Comment added successfully!\n');

    console.log('✨ Migration complete!');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    await sql.end();
  }
}

addCreatorCardImageColumn().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
