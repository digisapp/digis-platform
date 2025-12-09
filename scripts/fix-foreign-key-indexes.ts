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

async function fixForeignKeyIndexes() {
  console.log('🔧 Adding indexes for unindexed foreign keys...\n');

  // Foreign keys that need indexes
  const fkIndexes = [
    { table: 'content_purchases', column: 'transaction_id', name: 'idx_content_purchases_transaction' },
    { table: 'conversations', column: 'last_message_sender_id', name: 'idx_conversations_last_sender' },
    { table: 'creator_applications', column: 'reviewed_by', name: 'idx_creator_applications_reviewer' },
    { table: 'creator_category_assignments', column: 'creator_id', name: 'idx_creator_cat_assignments_creator' },
    { table: 'message_requests', column: 'conversation_id', name: 'idx_message_requests_conversation' },
    { table: 'messages', column: 'tip_transaction_id', name: 'idx_messages_tip_transaction' },
    { table: 'messages', column: 'unlocked_by', name: 'idx_messages_unlocked_by' },
    { table: 'payout_requests', column: 'banking_info_id', name: 'idx_payout_requests_banking' },
    { table: 'show_reminders', column: 'show_id', name: 'idx_show_reminders_show' },
    { table: 'show_reminders', column: 'user_id', name: 'idx_show_reminders_user' },
    { table: 'show_tickets', column: 'transaction_id', name: 'idx_show_tickets_transaction' },
    { table: 'shows', column: 'stream_id', name: 'idx_shows_stream' },
    { table: 'stream_gifts', column: 'gift_id', name: 'idx_stream_gifts_gift' },
    { table: 'stream_goals', column: 'gift_id', name: 'idx_stream_goals_gift' },
    { table: 'subscriptions', column: 'tier_id', name: 'idx_subscriptions_tier' },
    { table: 'vod_purchases', column: 'user_id', name: 'idx_vod_purchases_user' },
    { table: 'vod_purchases', column: 'vod_id', name: 'idx_vod_purchases_vod' },
    { table: 'vod_views', column: 'user_id', name: 'idx_vod_views_user' },
    { table: 'vod_views', column: 'vod_id', name: 'idx_vod_views_vod' },
    { table: 'vods', column: 'creator_id', name: 'idx_vods_creator' },
    { table: 'vods', column: 'stream_id', name: 'idx_vods_stream' },
  ];

  let created = 0;
  let skipped = 0;

  for (const idx of fkIndexes) {
    try {
      // Check if index already exists
      const exists = await sql`
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = ${idx.table}
        AND indexname = ${idx.name}
      `;

      if (exists.length > 0) {
        console.log(`⏭️  Exists: ${idx.name}`);
        skipped++;
        continue;
      }

      // Create index
      await sql.unsafe(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`);
      console.log(`✅ Created: ${idx.name} on ${idx.table}(${idx.column})`);
      created++;
    } catch (error: any) {
      // Index might already exist with different name
      if (error.message.includes('already exists')) {
        console.log(`⏭️  Already indexed: ${idx.table}.${idx.column}`);
        skipped++;
      } else {
        console.error(`❌ Error creating ${idx.name}:`, error.message);
      }
    }
  }

  console.log(`\n📊 FK Indexes: ${created} created, ${skipped} skipped`);

  await sql.end();
  process.exit(0);
}

fixForeignKeyIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
