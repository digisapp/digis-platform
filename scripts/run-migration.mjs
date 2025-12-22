import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');

// Parse env vars
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const dbUrl = env.DIRECT_DATABASE_URL || env.DATABASE_URL;
if (!dbUrl) {
  console.error('No DATABASE_URL found in .env.local');
  process.exit(1);
}

console.log('Connecting to database...');
const sql = postgres(dbUrl);

async function migrate() {
  try {
    // 1. Create verification_status enum if not exists
    console.log('Creating verification_status enum...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE verification_status AS ENUM ('none', 'grandfathered', 'pending', 'verified', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✓ verification_status enum ready');

    // 2. Create invite_status enum if not exists
    console.log('Creating invite_status enum...');
    await sql`
      DO $$ BEGIN
        CREATE TYPE invite_status AS ENUM ('pending', 'claimed', 'expired', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✓ invite_status enum ready');

    // 3. Add verification_status column to users if not exists
    console.log('Adding verification_status to users table...');
    await sql`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN verification_status verification_status NOT NULL DEFAULT 'none';
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `;
    console.log('✓ verification_status column ready');

    // 4. Create creator_invites table if not exists
    console.log('Creating creator_invites table...');
    await sql`
      CREATE TABLE IF NOT EXISTS creator_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL UNIQUE,
        instagram_handle TEXT NOT NULL,
        email TEXT,
        display_name TEXT,
        status invite_status NOT NULL DEFAULT 'pending',
        claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        claimed_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        batch_id TEXT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✓ creator_invites table ready');

    // 5. Create indexes
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS creator_invites_code_idx ON creator_invites(code);`;
    await sql`CREATE INDEX IF NOT EXISTS creator_invites_status_idx ON creator_invites(status);`;
    await sql`CREATE INDEX IF NOT EXISTS creator_invites_instagram_idx ON creator_invites(instagram_handle);`;
    await sql`CREATE INDEX IF NOT EXISTS creator_invites_batch_idx ON creator_invites(batch_id);`;
    await sql`CREATE INDEX IF NOT EXISTS creator_invites_expires_idx ON creator_invites(expires_at);`;
    console.log('✓ indexes created');

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
