/**
 * One-time script: Sync DB is_admin to Supabase app_metadata.isAdmin
 *
 * This ensures that after the SQL migration, all admins have their
 * Supabase auth metadata in sync with the database.
 *
 * Usage:
 *   npx tsx scripts/sync-admin-metadata.ts          # Dry run (default)
 *   npx tsx scripts/sync-admin-metadata.ts --apply  # Actually sync
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
}

async function syncAdminMetadata() {
  const connectionString = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const isDryRun = !process.argv.includes('--apply');

  console.log('🔄 Supabase Admin Metadata Sync');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (use --apply to sync)' : 'APPLYING CHANGES'}\n`);

  // Create connections
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Step 1: Get all admins from DB
    console.log('📊 Step 1: Fetching admins from database...');
    const admins = await db.execute(sql`
      SELECT id, email, username, is_admin
      FROM users
      WHERE is_admin = TRUE
    `) as unknown as AdminUser[];

    console.log(`   Found ${admins.length} admin(s) in database\n`);

    if (admins.length === 0) {
      console.log('✅ No admins to sync.');
      return;
    }

    // Step 2: Check current Supabase metadata for each admin
    console.log('🔍 Step 2: Checking Supabase auth metadata...\n');

    const results: { userId: string; email: string; status: string; error?: string }[] = [];

    for (const admin of admins) {
      try {
        // Get current user from Supabase auth
        const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(admin.id);

        if (getUserError) {
          results.push({ userId: admin.id, email: admin.email, status: 'error', error: getUserError.message });
          continue;
        }

        const currentMeta = userData.user?.app_metadata || {};
        const hasIsAdmin = currentMeta.isAdmin === true;
        const hasLegacyRole = currentMeta.role === 'admin';

        if (hasIsAdmin && !hasLegacyRole) {
          results.push({ userId: admin.id, email: admin.email, status: 'already_synced' });
          console.log(`   ✅ ${admin.email} - already synced (isAdmin=true)`);
          continue;
        }

        // Build new metadata
        const newMeta = { ...currentMeta, isAdmin: true };
        // Remove legacy role='admin' if present
        if (hasLegacyRole) {
          delete newMeta.role;
        }

        if (isDryRun) {
          const changes = [];
          if (!hasIsAdmin) changes.push('add isAdmin=true');
          if (hasLegacyRole) changes.push('remove role=admin');
          results.push({ userId: admin.id, email: admin.email, status: `would_sync: ${changes.join(', ')}` });
          console.log(`   🔄 ${admin.email} - would sync: ${changes.join(', ')}`);
        } else {
          // Actually update Supabase
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
            app_metadata: newMeta,
          });

          if (updateError) {
            results.push({ userId: admin.id, email: admin.email, status: 'error', error: updateError.message });
            console.log(`   ❌ ${admin.email} - failed: ${updateError.message}`);
          } else {
            const changes = [];
            if (!hasIsAdmin) changes.push('isAdmin=true');
            if (hasLegacyRole) changes.push('removed role=admin');
            results.push({ userId: admin.id, email: admin.email, status: `synced: ${changes.join(', ')}` });
            console.log(`   ✅ ${admin.email} - synced: ${changes.join(', ')}`);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ userId: admin.id, email: admin.email, status: 'error', error: errorMessage });
        console.log(`   ❌ ${admin.email} - error: ${errorMessage}`);
      }
    }

    // Summary
    console.log('\n📋 Summary:');
    const synced = results.filter(r => r.status.startsWith('synced') || r.status.startsWith('would_sync'));
    const alreadySynced = results.filter(r => r.status === 'already_synced');
    const errors = results.filter(r => r.status === 'error');

    console.log(`   ${alreadySynced.length} already synced`);
    console.log(`   ${synced.length} ${isDryRun ? 'would be synced' : 'synced'}`);
    console.log(`   ${errors.length} errors`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const err of errors) {
        console.log(`   - ${err.email}: ${err.error}`);
      }
    }

    if (isDryRun && synced.length > 0) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npx tsx scripts/sync-admin-metadata.ts --apply');
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

syncAdminMetadata();
