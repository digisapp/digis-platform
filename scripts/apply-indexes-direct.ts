import postgres from 'postgres';

const connectionString = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
  .replace('postgres://', 'postgresql://');

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL not found');
  console.error('Set it with: DATABASE_URL="..." npx tsx scripts/apply-indexes-direct.ts');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
  max: 1
});

async function applyIndexes() {
  console.log('🔧 Applying performance indexes...\n');

  const indexes = [
    {
      name: 'idx_users_role_online_followers',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_online_followers
            ON users(role, is_online DESC, follower_count DESC)
            WHERE role = 'creator'`,
      description: 'Explore page queries (role + online + followers)'
    },
    {
      name: 'idx_conversations_user1_last_message',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user1_last_message
            ON conversations(user1_id, last_message_at DESC)`,
      description: 'Conversations for user1'
    },
    {
      name: 'idx_conversations_user2_last_message',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user2_last_message
            ON conversations(user2_id, last_message_at DESC)`,
      description: 'Conversations for user2'
    },
    {
      name: 'idx_messages_conversation_created',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created
            ON messages(conversation_id, created_at DESC)`,
      description: 'Messages by conversation'
    },
    {
      name: 'idx_streams_creator_status',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_streams_creator_status
            ON streams(creator_id, status, started_at DESC)`,
      description: 'Streams by creator'
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

  console.log('\n✨ Index creation complete!');
  await sql.end();
}

applyIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
