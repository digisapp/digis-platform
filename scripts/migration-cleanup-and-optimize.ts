import { db } from '@/lib/data/system';
import { sql } from 'drizzle-orm';

/**
 * Migration Script: Cleanup and Optimize Database
 *
 * This script:
 * 1. Drops unused category columns from streams and vods
 * 2. Fixes unread count types from text to integer
 * 3. Fixes message request paid amount type
 * 4. Adds missing performance indexes
 */

async function runMigration() {
  console.log('🔄 Starting database migration...\n');

  try {
    // 1. Drop unused category columns
    console.log('📝 Step 1: Removing unused category columns...');

    await db.execute(sql`
      ALTER TABLE streams DROP COLUMN IF EXISTS category;
    `);
    console.log('  ✅ Removed category from streams table');

    try {
      await db.execute(sql`
        ALTER TABLE vods DROP COLUMN IF EXISTS category;
      `);
      console.log('  ✅ Removed category from vods table\n');
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('  ⚠️  VODs table does not exist yet (skipping)\n');
      } else {
        throw error;
      }
    }

    // 2. Fix unread count types
    console.log('📝 Step 2: Converting unread counts from text to integer...');

    await db.execute(sql`
      ALTER TABLE conversations
        ALTER COLUMN user1_unread_count DROP DEFAULT,
        ALTER COLUMN user2_unread_count DROP DEFAULT;
    `);

    await db.execute(sql`
      ALTER TABLE conversations
        ALTER COLUMN user1_unread_count TYPE INTEGER USING user1_unread_count::integer,
        ALTER COLUMN user2_unread_count TYPE INTEGER USING user2_unread_count::integer;
    `);

    await db.execute(sql`
      ALTER TABLE conversations
        ALTER COLUMN user1_unread_count SET DEFAULT 0,
        ALTER COLUMN user2_unread_count SET DEFAULT 0;
    `);
    console.log('  ✅ Fixed unread count types in conversations table\n');

    // 3. Fix message request paid amount type
    console.log('📝 Step 3: Converting paid_amount from text to integer...');

    await db.execute(sql`
      ALTER TABLE message_requests
        ALTER COLUMN paid_amount DROP DEFAULT;
    `);

    await db.execute(sql`
      ALTER TABLE message_requests
        ALTER COLUMN paid_amount TYPE INTEGER USING paid_amount::integer;
    `);

    await db.execute(sql`
      ALTER TABLE message_requests
        ALTER COLUMN paid_amount SET DEFAULT 0;
    `);
    console.log('  ✅ Fixed paid_amount type in message_requests table\n');

    // 4. Add missing performance indexes
    console.log('📝 Step 4: Adding performance indexes...');

    // Index for locked message purchases
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_messages_unlocked_by
      ON messages (unlocked_by, unlocked_at DESC)
      WHERE is_locked = true;
    `);
    console.log('  ✅ Added index: idx_messages_unlocked_by');

    // Index for VOD queries by creator (skip if table doesn't exist)
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_vods_creator_created
        ON vods (creator_id, created_at DESC);
      `);
      console.log('  ✅ Added index: idx_vods_creator_created');
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('  ⚠️  VODs table does not exist yet (skipping index)');
      } else {
        throw error;
      }
    }

    // Index for VOD purchases by user
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_vod_purchases_user
        ON vod_purchases (user_id, purchased_at DESC);
      `);
      console.log('  ✅ Added index: idx_vod_purchases_user');
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('  ⚠️  VOD purchases table does not exist yet (skipping index)');
      } else {
        throw error;
      }
    }

    // Index for VOD views by user
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_vod_views_user
        ON vod_views (user_id, viewed_at DESC);
      `);
      console.log('  ✅ Added index: idx_vod_views_user');
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log('  ⚠️  VOD views table does not exist yet (skipping index)');
      } else {
        throw error;
      }
    }

    // Index for stream viewers
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream_joined
      ON stream_viewers (stream_id, joined_at DESC);
    `);
    console.log('  ✅ Added index: idx_stream_viewers_stream_joined');

    // Index for stream goals
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_stream_goals_stream_created
      ON stream_goals (stream_id, created_at DESC);
    `);
    console.log('  ✅ Added index: idx_stream_goals_stream_created\n');

    console.log('✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  • Removed 2 unused category columns');
    console.log('  • Fixed 3 type mismatches (text → integer)');
    console.log('  • Added 6 performance indexes');
    console.log('\n🚀 Database is now optimized!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
