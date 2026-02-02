/**
 * One-time migration script: Sync legacy role='admin' users to is_admin=true
 *
 * Run with: npx tsx scripts/run-admin-migration.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Create a direct connection (not pooled) for migration
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('🔄 Starting legacy admin role migration...\n');

  try {
    // Step 1: Audit - Check for legacy admins
    console.log('📊 Step 1: Auditing legacy admins...');
    const auditResult = await db.execute(sql`
      SELECT
        COUNT(*) AS legacy_admin_count,
        array_agg(email) AS legacy_admin_emails
      FROM users
      WHERE role = 'admin'
        AND is_admin IS DISTINCT FROM TRUE
    `);

    const legacyCount = Number(auditResult[0]?.legacy_admin_count || 0);
    const legacyEmails = auditResult[0]?.legacy_admin_emails;

    console.log(`   Found ${legacyCount} legacy admin(s) to migrate`);
    if (legacyCount > 0 && legacyEmails) {
      console.log(`   Emails: ${legacyEmails}`);
    }
    console.log('');

    if (legacyCount === 0) {
      console.log('✅ No legacy admins to migrate. All admins already use is_admin=true.');
    } else {
      // Step 2: Promote legacy admins
      console.log('🔧 Step 2: Promoting legacy admins to is_admin=true...');
      const updateResult = await db.execute(sql`
        UPDATE users
        SET
          is_admin = TRUE,
          updated_at = NOW()
        WHERE role = 'admin'
          AND is_admin IS DISTINCT FROM TRUE
        RETURNING id, email, username
      `);

      console.log(`   Updated ${updateResult.length} user(s)`);
      for (const row of updateResult) {
        console.log(`   - ${row.email} (@${row.username})`);
      }
      console.log('');
    }

    // Step 3: Show all current admins
    console.log('📋 Step 3: Current admins after migration:');
    const adminsResult = await db.execute(sql`
      SELECT
        id,
        email,
        username,
        role,
        is_admin,
        updated_at
      FROM users
      WHERE is_admin = TRUE OR role = 'admin'
      ORDER BY updated_at DESC
    `);

    console.log('');
    console.log('   ID                                   | Email                          | Username      | Role    | is_admin');
    console.log('   ' + '-'.repeat(110));
    for (const row of adminsResult) {
      const id = String(row.id).substring(0, 36);
      const email = String(row.email || '').padEnd(30).substring(0, 30);
      const username = String(row.username || '').padEnd(13).substring(0, 13);
      const role = String(row.role || '').padEnd(7);
      const isAdmin = row.is_admin ? 'true' : 'false';
      console.log(`   ${id} | ${email} | ${username} | ${role} | ${isAdmin}`);
    }
    console.log('');

    console.log('✅ Migration complete!');
    console.log('');
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Verify admins can access /admin routes');
    console.log('   2. If any admin cannot access, sync their Supabase app_metadata:');
    console.log('      await AdminService.setAdminStatus(userId, true);');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigration();
