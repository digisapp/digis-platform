#!/usr/bin/env tsx
/**
 * Backfill Script: Update app_metadata.role for all creators and admins
 *
 * This script ensures ALL existing creators and admins have their role
 * stored in Supabase auth app_metadata (JWT), preventing role switching issues.
 *
 * Run with: npx tsx scripts/backfill-user-roles.ts
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL must be set
 * - SUPABASE_SERVICE_ROLE_KEY must be set (server-only, never in browser)
 * - Database must be accessible
 */

import { db } from '../src/lib/data/system';
import { users } from '../src/lib/data/system';
import { supabaseAdmin } from '../src/lib/supabase/admin';
import { eq, or } from 'drizzle-orm';

async function verifyJWTRoles(userIds: string[]) {
  const verified: { id: string; hasJWTRole: boolean; jwtRole?: string }[] = [];

  for (const userId of userIds.slice(0, 5)) { // Sample first 5
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!error && user) {
        verified.push({
          id: userId,
          hasJWTRole: !!(user.app_metadata as any)?.role,
          jwtRole: (user.app_metadata as any)?.role,
        });
      }
    } catch (err) {
      // Ignore verification errors
    }
  }
  return verified;
}

async function backfillUserRoles() {
  console.log('🚀 Starting user role backfill...\n');

  try {
    // Get all users with creator or admin roles
    const usersToUpdate = await db.query.users.findMany({
      where: or(
        eq(users.role, 'creator'),
        eq(users.role, 'admin')
      ),
      columns: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isCreatorVerified: true,
      }
    });

    console.log(`📊 Found ${usersToUpdate.length} users to update:\n`);

    const creators = usersToUpdate.filter(u => u.role === 'creator');
    const admins = usersToUpdate.filter(u => u.role === 'admin');

    console.log(`   - ${creators.length} creators`);
    console.log(`   - ${admins.length} admins\n`);

    if (usersToUpdate.length === 0) {
      console.log('✅ No users to update. All done!');
      return;
    }

    // Verify BEFORE backfill (sample)
    console.log('🔍 Checking JWT roles before backfill (sampling first 5 users)...');
    const beforeVerify = await verifyJWTRoles(usersToUpdate.map(u => u.id));
    const beforeWithRole = beforeVerify.filter(v => v.hasJWTRole).length;
    console.log(`   ${beforeWithRole}/${beforeVerify.length} sampled users already have JWT role\n`);

    // Update each user's auth metadata
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < usersToUpdate.length; i++) {
      const user = usersToUpdate[i];
      const progress = `[${i + 1}/${usersToUpdate.length}]`;

      try {
        // Check if user already has the correct role in JWT
        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(user.id);
        const currentJWTRole = (authUser?.app_metadata as any)?.role;

        if (currentJWTRole === user.role) {
          console.log(`⏭️  ${progress} Skipped ${user.email || user.username} (already has ${user.role} in JWT)`);
          skippedCount++;
          continue;
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            app_metadata: { role: user.role },
            user_metadata: {
              is_creator_verified: user.isCreatorVerified,
              display_name: user.displayName,
            }
          }
        );

        if (error) {
          console.error(`❌ ${progress} Failed to update ${user.email} (${user.role}):`, error.message);
          errorCount++;
        } else {
          console.log(`✅ ${progress} Updated ${user.email || user.username} → ${user.role}`);
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ ${progress} Error updating ${user.email}:`, err.message);
        errorCount++;
      }

      // Rate limit: wait 100ms between requests to avoid hitting Supabase limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   ✅ Updated: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount} (already correct)`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${usersToUpdate.length}\n`);

    // Verify AFTER backfill (sample)
    console.log('🔍 Verifying JWT roles after backfill (sampling first 5 users)...');
    const afterVerify = await verifyJWTRoles(usersToUpdate.map(u => u.id));
    const afterWithRole = afterVerify.filter(v => v.hasJWTRole).length;
    console.log(`   ${afterWithRole}/${afterVerify.length} sampled users now have JWT role\n`);

    if (errorCount > 0) {
      console.log('⚠️  Some users failed to update. Check error messages above.');
      process.exit(1);
    } else {
      console.log('🎉 All users successfully updated!');
      console.log('💡 Users will need to refresh their session to get updated JWT.');
      console.log('💡 Existing sessions will get new role on next token refresh (auto).');
    }

  } catch (error: any) {
    console.error('❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillUserRoles()
  .then(() => {
    console.log('\n✨ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
