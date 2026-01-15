/**
 * Delete a user account completely
 * Usage: npx tsx scripts/delete-user.ts <username>
 *
 * This script:
 * 1. Finds the user by username
 * 2. Deletes from Supabase Auth
 * 3. Deletes from database (cascade handles related tables)
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const username = process.argv[2];

if (!username) {
  console.error('Usage: npx tsx scripts/delete-user.ts <username>');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function deleteUser() {
  try {
    console.log(`\nLooking for user: ${username}\n`);

    // Find user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (!user) {
      console.error(`❌ User not found: ${username}`);
      process.exit(1);
    }

    console.log('Found user:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Username:', user.username);
    console.log('  Display Name:', user.displayName);
    console.log('  Role:', user.role);
    console.log('  Created:', user.createdAt);
    console.log();

    // Step 1: Delete from Supabase Auth
    console.log('Deleting from Supabase Auth...');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authError) {
      console.error('⚠️  Warning: Failed to delete from Supabase Auth:', authError.message);
      console.log('   Continuing with database deletion...');
    } else {
      console.log('✅ Deleted from Supabase Auth');
    }

    // Step 2: Delete from database (cascade will handle related tables)
    console.log('Deleting from database...');
    await db.delete(users).where(eq(users.id, user.id));
    console.log('✅ Deleted from database');

    console.log(`\n✅ Successfully deleted user: ${username}\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteUser();
