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

async function addEarningsIndex() {
  console.log('🔧 Adding composite index for earnings queries...\n');

  try {
    // Check if index already exists
    const exists = await sql`
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'wallet_transactions'
      AND indexname = 'idx_wallet_tx_user_status_type'
    `;

    if (exists.length > 0) {
      console.log('⏭️  Index idx_wallet_tx_user_status_type already exists');
    } else {
      // Create composite index for earnings sum queries
      // This covers: WHERE user_id = X AND status = 'completed' AND type IN (...)
      await sql.unsafe(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_tx_user_status_type
        ON wallet_transactions(user_id, status, type)
      `);
      console.log('✅ Created: idx_wallet_tx_user_status_type on wallet_transactions(user_id, status, type)');
    }

    console.log('\n📊 Done!');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('⏭️  Index already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  }

  await sql.end();
  process.exit(0);
}

addEarningsIndex().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
