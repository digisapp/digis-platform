/**
 * One-time script to repair creators with role/settings issues
 *
 * Run with: npx tsx scripts/repair-creators.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local first, then .env.production as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNotNull } from 'drizzle-orm';
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

interface RepairResult {
  userId: string;
  username: string;
  email: string;
  issues: string[];
  fixed: string[];
  errors: string[];
}

async function repairCreators() {
  console.log('🔧 Starting creator repair...\n');

  const results: RepairResult[] = [];
  let totalFixed = 0;
  let totalErrors = 0;

  // 1. Find all claimed invites
  console.log('📋 Finding claimed invites...');
  const claimedInvites = await db.query.creatorInvites.findMany({
    where: and(
      eq(schema.creatorInvites.status, 'claimed'),
      isNotNull(schema.creatorInvites.claimedBy)
    ),
  });
  console.log(`   Found ${claimedInvites.length} claimed invites\n`);

  for (const invite of claimedInvites) {
    if (!invite.claimedBy) continue;

    const result: RepairResult = {
      userId: invite.claimedBy,
      username: invite.instagramHandle,
      email: invite.email || '',
      issues: [],
      fixed: [],
      errors: [],
    };

    // Get the user
    const userRecord = await db.query.users.findFirst({
      where: eq(schema.users.id, invite.claimedBy),
    });

    if (!userRecord) {
      result.issues.push('User record not found');
      result.errors.push('Cannot fix - user does not exist');
      results.push(result);
      totalErrors++;
      continue;
    }

    result.username = userRecord.username || invite.instagramHandle;
    result.email = userRecord.email || invite.email || '';

    console.log(`🔍 Checking: @${result.username} (${result.email})`);

    // Check 1: Role should be 'creator'
    if (userRecord.role !== 'creator') {
      result.issues.push(`Role is '${userRecord.role}' instead of 'creator'`);

      try {
        await db.update(schema.users)
          .set({
            role: 'creator',
            isCreatorVerified: true,
            updatedAt: new Date()
          })
          .where(eq(schema.users.id, invite.claimedBy));

        result.fixed.push('✅ Updated role to creator in database');
        totalFixed++;
      } catch (err: any) {
        result.errors.push(`Failed to update role: ${err.message}`);
        totalErrors++;
      }
    }

    // Check 2: Auth metadata should have role='creator'
    try {
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(invite.claimedBy);

      if (authUserError) {
        result.issues.push('Could not fetch auth user');
        result.errors.push(authUserError.message);
      } else if (authUser?.user) {
        const appMetadata = authUser.user.app_metadata || {};

        if (appMetadata.role !== 'creator') {
          result.issues.push(`Auth metadata role is '${appMetadata.role || 'undefined'}'`);

          try {
            await supabaseAdmin.auth.admin.updateUserById(invite.claimedBy, {
              app_metadata: { role: 'creator' },
              user_metadata: { is_creator_verified: true },
            });
            result.fixed.push('✅ Updated auth metadata with role=creator');
            totalFixed++;
          } catch (authErr: any) {
            result.errors.push(`Failed to update auth metadata: ${authErr.message}`);
            totalErrors++;
          }
        }
      }
    } catch (authCheckErr: any) {
      result.issues.push('Error checking auth metadata');
      result.errors.push(authCheckErr.message);
      totalErrors++;
    }

    // Check 3: Creator settings should exist
    const existingSettings = await db.query.creatorSettings.findFirst({
      where: eq(schema.creatorSettings.userId, invite.claimedBy),
    });

    if (!existingSettings) {
      result.issues.push('Missing creator_settings record');

      try {
        await db.insert(schema.creatorSettings).values({
          userId: invite.claimedBy,
          messageRate: 25,
          callRatePerMinute: 25,
          minimumCallDuration: 5,
          isAvailableForCalls: false,
          voiceCallRatePerMinute: 15,
          minimumVoiceCallDuration: 5,
          isAvailableForVoiceCalls: false,
        }).onConflictDoNothing();

        result.fixed.push('✅ Created creator_settings record');
        totalFixed++;
      } catch (settingsErr: any) {
        result.errors.push(`Failed to create creator_settings: ${settingsErr.message}`);
        totalErrors++;
      }
    }

    // Log results for this user
    if (result.issues.length > 0) {
      console.log(`   Issues found: ${result.issues.join(', ')}`);
      if (result.fixed.length > 0) {
        result.fixed.forEach(f => console.log(`   ${f}`));
      }
      if (result.errors.length > 0) {
        result.errors.forEach(e => console.log(`   ❌ ${e}`));
      }
      results.push(result);
    } else {
      console.log(`   ✓ All good!`);
    }
    console.log('');
  }

  // 2. Also check existing creators for auth metadata issues
  console.log('📋 Checking all existing creators...');
  const allCreators = await db.query.users.findMany({
    where: eq(schema.users.role, 'creator'),
  });
  console.log(`   Found ${allCreators.length} creators\n`);

  for (const creator of allCreators) {
    // Skip if already processed
    if (results.some(r => r.userId === creator.id)) continue;

    const result: RepairResult = {
      userId: creator.id,
      username: creator.username || '',
      email: creator.email || '',
      issues: [],
      fixed: [],
      errors: [],
    };

    console.log(`🔍 Checking: @${result.username}`);

    // Check auth metadata
    try {
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(creator.id);

      if (authUserError) {
        result.issues.push('Could not fetch auth user');
      } else if (authUser?.user) {
        const appMetadata = authUser.user.app_metadata || {};

        if (appMetadata.role !== 'creator') {
          result.issues.push(`Auth metadata role is '${appMetadata.role || 'undefined'}'`);

          try {
            await supabaseAdmin.auth.admin.updateUserById(creator.id, {
              app_metadata: { role: 'creator' },
              user_metadata: { is_creator_verified: true },
            });
            result.fixed.push('✅ Updated auth metadata with role=creator');
            totalFixed++;
          } catch (authErr: any) {
            result.errors.push(`Failed to update auth metadata: ${authErr.message}`);
            totalErrors++;
          }
        }
      }
    } catch (authCheckErr: any) {
      result.issues.push('Error checking auth metadata');
      totalErrors++;
    }

    // Check creator settings
    const existingSettings = await db.query.creatorSettings.findFirst({
      where: eq(schema.creatorSettings.userId, creator.id),
    });

    if (!existingSettings) {
      result.issues.push('Missing creator_settings');

      try {
        await db.insert(schema.creatorSettings).values({
          userId: creator.id,
          messageRate: 25,
          callRatePerMinute: 25,
          minimumCallDuration: 5,
          isAvailableForCalls: false,
          voiceCallRatePerMinute: 15,
          minimumVoiceCallDuration: 5,
          isAvailableForVoiceCalls: false,
        }).onConflictDoNothing();

        result.fixed.push('✅ Created creator_settings record');
        totalFixed++;
      } catch (settingsErr: any) {
        result.errors.push(`Failed to create creator_settings: ${settingsErr.message}`);
        totalErrors++;
      }
    }

    if (result.issues.length > 0) {
      console.log(`   Issues: ${result.issues.join(', ')}`);
      result.fixed.forEach(f => console.log(`   ${f}`));
      result.errors.forEach(e => console.log(`   ❌ ${e}`));
      results.push(result);
    } else {
      console.log(`   ✓ All good!`);
    }
    console.log('');
  }

  // Summary
  console.log('═'.repeat(50));
  console.log('📊 REPAIR SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Total creators checked: ${claimedInvites.length + allCreators.length}`);
  console.log(`Creators with issues: ${results.length}`);
  console.log(`Total fixes applied: ${totalFixed}`);
  console.log(`Total errors: ${totalErrors}`);

  if (results.length > 0) {
    console.log('\nCreators that were fixed:');
    results.forEach(r => {
      console.log(`  - @${r.username}: ${r.fixed.length} fixes, ${r.errors.length} errors`);
    });
  }

  console.log('\n✅ Repair complete!');

  await sql.end();
  process.exit(0);
}

repairCreators().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
