import postgres from 'postgres';

const connectionString = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
  .replace('postgres://', 'postgresql://');

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL not found');
  console.error('Set it with: DATABASE_URL="..." npx tsx scripts/apply-user-discovery-indexes.ts');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
  max: 1
});

async function applyUserDiscoveryIndexes() {
  console.log('🔧 Applying user discovery indexes...\n');

  const indexes = [
    {
      name: 'users_role_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_role_idx" ON "users" ("role")`,
      description: 'Index for filtering users by role (creator discovery)'
    },
    {
      name: 'users_is_online_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_is_online_idx" ON "users" ("is_online")`,
      description: 'Index for online status filtering'
    },
    {
      name: 'users_explore_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_explore_idx" ON "users" ("role", "is_hidden_from_discovery", "is_trending")`,
      description: 'Compound index for explore page queries (visible creators, sorted by trending)'
    },
    {
      name: 'users_primary_category_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_primary_category_idx" ON "users" ("primary_category")`,
      description: 'Index for category-based discovery'
    }
  ];

  for (const index of indexes) {
    try {
      console.log(`⏳ Creating ${index.name}...`);
      await sql.unsafe(index.sql);
      console.log(`✅ Created: ${index.name}`);
      console.log(`   ${index.description}\n`);
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log(`ℹ️  Skipped: ${index.name} (already exists)\n`);
      } else {
        console.log(`❌ Error on ${index.name}: ${err.message}\n`);
      }
    }
  }

  console.log('\n✨ User discovery index creation complete!');
  await sql.end();
}

applyUserDiscoveryIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
