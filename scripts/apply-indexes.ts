import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyIndexes() {
  console.log('🔧 Applying performance indexes...\n');

  const indexes = [
    {
      name: 'idx_users_role_online_followers',
      sql: `CREATE INDEX IF NOT EXISTS idx_users_role_online_followers
            ON users(role, is_online DESC, follower_count DESC)
            WHERE role = 'creator'`,
      description: 'Explore page queries (role + online + followers)'
    },
    {
      name: 'idx_conversations_user1_last_message',
      sql: `CREATE INDEX IF NOT EXISTS idx_conversations_user1_last_message
            ON conversations(user1_id, last_message_at DESC)`,
      description: 'Conversations for user1'
    },
    {
      name: 'idx_conversations_user2_last_message',
      sql: `CREATE INDEX IF NOT EXISTS idx_conversations_user2_last_message
            ON conversations(user2_id, last_message_at DESC)`,
      description: 'Conversations for user2'
    },
    {
      name: 'idx_messages_conversation_created',
      sql: `CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
            ON messages(conversation_id, created_at DESC)`,
      description: 'Messages by conversation'
    },
    {
      name: 'idx_streams_creator_status',
      sql: `CREATE INDEX IF NOT EXISTS idx_streams_creator_status
            ON streams(creator_id, status, started_at DESC)`,
      description: 'Streams by creator'
    }
  ];

  for (const index of indexes) {
    try {
      console.log(`⏳ Creating ${index.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: index.sql });

      if (error) {
        console.log(`❌ Failed: ${index.name} - ${error.message}`);
      } else {
        console.log(`✅ Created: ${index.name}`);
        console.log(`   ${index.description}\n`);
      }
    } catch (err: any) {
      console.log(`❌ Error on ${index.name}: ${err.message}\n`);
    }
  }

  console.log('\n✨ Index creation complete!');
  console.log('Note: Indexes are created IF NOT EXISTS, so duplicates are safe.\n');
}

applyIndexes().catch(console.error);
