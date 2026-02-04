import postgres from 'postgres';

const connectionString = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
  .replace('postgres://', 'postgresql://');

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL not found');
  console.error('Set it with: DATABASE_URL="..." npx tsx scripts/apply-leaderboard-indexes.ts');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
  max: 1
});

async function applyLeaderboardIndexes() {
  console.log('🔧 Applying stream leaderboard indexes...\n');

  const indexes = [
    {
      name: 'stream_gifts_leaderboard_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "stream_gifts_leaderboard_idx"
            ON "stream_gifts" ("stream_id", "sender_id", "total_coins" DESC)`,
      description: 'Leaderboard queries - gifts by stream and sender, ordered by coins'
    },
    {
      name: 'stream_gifts_stream_created_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "stream_gifts_stream_created_idx"
            ON "stream_gifts" ("stream_id", "created_at" DESC)`,
      description: 'Recent gifts queries - gifts by stream, ordered by creation time'
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

  console.log('\n✨ Leaderboard index creation complete!');
  await sql.end();
}

applyLeaderboardIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
