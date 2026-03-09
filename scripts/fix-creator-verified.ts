/**
 * Fix creators who were approved but have isCreatorVerified = false
 * due to bug in approve route (was setting false instead of true)
 *
 * Run with: npx tsx scripts/fix-creator-verified.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sql = postgres(databaseUrl);
const db = drizzle(sql, { schema });

async function fixCreatorVerified() {
  console.log('Finding creators with isCreatorVerified = false...\n');

  const unverifiedCreators = await db.query.users.findMany({
    where: and(
      eq(schema.users.role, 'creator'),
      eq(schema.users.isCreatorVerified, false)
    ),
    columns: {
      id: true,
      username: true,
      email: true,
    },
  });

  if (unverifiedCreators.length === 0) {
    console.log('No creators with isCreatorVerified = false found. All good!');
    await sql.end();
    process.exit(0);
  }

  console.log(`Found ${unverifiedCreators.length} creators to fix:\n`);

  for (const creator of unverifiedCreators) {
    console.log(`Fixing @${creator.username} (${creator.email})...`);

    // 1. Fix database
    await db.update(schema.users)
      .set({
        isCreatorVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, creator.id));

    // 2. Fix Supabase auth metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(creator.id, {
        app_metadata: { is_creator_verified: true },
        user_metadata: { is_creator_verified: true },
      });
      console.log(`  Done - DB + auth metadata updated`);
    } catch (err: any) {
      console.log(`  DB updated, but auth metadata failed: ${err.message}`);
    }
  }

  console.log(`\nFixed ${unverifiedCreators.length} creators.`);

  await sql.end();
  process.exit(0);
}

fixCreatorVerified().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
