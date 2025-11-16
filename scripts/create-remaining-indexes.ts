import postgres from 'postgres';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function createRemainingIndexes() {
  const client = postgres(connectionString!, { max: 1 });

  // Create the missing indexes one by one
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_streams_creator_created ON streams (creator_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_calls_creator_status_created ON calls (creator_id, status, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_conversations_user1_updated ON conversations (user1_id, updated_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions (user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_stream_gifts_stream_sender ON stream_gifts (stream_id, sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_follows_follower_created ON follows (follower_id, created_at DESC)',
    "CREATE INDEX IF NOT EXISTS idx_users_online_followers ON users (is_online DESC, follower_count DESC) WHERE role = 'creator'"
  ];

  console.log('📊 Creating remaining indexes...\n');

  for (const sql of indexes) {
    const name = sql.match(/idx_\w+/)?.[0];
    try {
      await client.unsafe(sql);
      console.log(`✅ ${name} created`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`⏭️  ${name} already exists`);
      } else {
        console.error(`❌ ${name} failed:`, error.message);
      }
    }
  }

  await client.end();
  console.log('\n✅ Done!');
}

createRemainingIndexes();
