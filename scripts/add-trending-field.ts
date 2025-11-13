import postgres from 'postgres';

const connectionString = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
  .replace('postgres://', 'postgresql://');

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL not found');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
  max: 1
});

async function addTrendingField() {
  console.log('🔧 Adding is_trending column to users table...\n');

  try {
    console.log('⏳ Adding column...');
    await sql.unsafe(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;
    `);
    console.log('✅ Column added successfully!\n');

    console.log('⏳ Adding column comment...');
    await sql.unsafe(`
      COMMENT ON COLUMN users.is_trending IS 'Flag for trending creators to feature in carousel';
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

addTrendingField().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
