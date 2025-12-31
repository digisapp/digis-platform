import { sql } from 'drizzle-orm';
import { db } from '@/lib/data/system';

async function main() {
  console.log('Creating social share rewards tables...');
  
  // Create enum types
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE social_platform AS ENUM ('instagram_story', 'instagram_bio', 'tiktok_bio');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE share_submission_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  
  // Create social_share_submissions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS social_share_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform social_platform NOT NULL,
      screenshot_url TEXT NOT NULL,
      social_handle TEXT,
      status share_submission_status NOT NULL DEFAULT 'pending',
      coins_awarded INTEGER DEFAULT 0,
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMP,
      rejection_reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  
  // Create reward_config table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reward_config (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      reward_type TEXT NOT NULL UNIQUE,
      coins_amount INTEGER NOT NULL DEFAULT 100,
      is_active BOOLEAN NOT NULL DEFAULT true,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  
  // Insert default reward configs
  await db.execute(sql`
    INSERT INTO reward_config (reward_type, coins_amount, description)
    VALUES 
      ('instagram_story', 100, 'Share Digis profile on Instagram Story'),
      ('instagram_bio', 100, 'Add Digis link to Instagram bio'),
      ('tiktok_bio', 100, 'Add Digis link to TikTok bio')
    ON CONFLICT (reward_type) DO NOTHING;
  `);
  
  console.log('Tables created successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
