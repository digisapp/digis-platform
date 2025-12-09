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

async function cleanupDuplicateIndexes() {
  console.log('🧹 Cleaning up duplicate indexes...\n');

  // List of duplicate indexes to drop (keeping the better-named one)
  const indexesToDrop = [
    { name: 'idx_calls_status', table: 'calls', keep: 'calls_status_idx' },
    { name: 'idx_conversations_user1', table: 'conversations', keep: 'idx_conversations_user1_updated' },
    { name: 'idx_conversations_user2', table: 'conversations', keep: 'idx_conversations_user2_updated' },
    { name: 'idx_messages_sender', table: 'messages', keep: 'messages_sender_id_idx' },
    { name: 'idx_notifications_user_read', table: 'notifications', keep: 'idx_notifications_user_read_created' },
    { name: 'idx_tickets_show', table: 'show_tickets', keep: 'idx_show_tickets_show' },
    { name: 'idx_shows_live', table: 'shows', keep: 'idx_shows_status' },
    { name: 'idx_shows_upcoming', table: 'shows', keep: 'idx_shows_status_scheduled_start' },
    { name: 'idx_wallet_trans_user_created', table: 'wallet_transactions', keep: 'idx_wallet_tx_user_created' },
    { name: 'idx_wallets_user', table: 'wallets', keep: 'wallets_user_id_idx' },
  ];

  let dropped = 0;
  let skipped = 0;

  for (const idx of indexesToDrop) {
    try {
      // Check if index exists
      const exists = await sql`
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname = ${idx.name}
      `;

      if (exists.length > 0) {
        await sql.unsafe(`DROP INDEX IF EXISTS ${idx.name}`);
        console.log(`✅ Dropped: ${idx.name} (keeping ${idx.keep})`);
        dropped++;
      } else {
        console.log(`⏭️  Skipped: ${idx.name} (doesn't exist)`);
        skipped++;
      }
    } catch (error: any) {
      console.error(`❌ Error dropping ${idx.name}:`, error.message);
    }
  }

  console.log(`\n📊 Summary: ${dropped} dropped, ${skipped} skipped`);

  await sql.end();
  process.exit(0);
}

cleanupDuplicateIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
