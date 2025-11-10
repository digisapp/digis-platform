/**
 * Check if admin user has username set, and set it if missing
 * Usage: DATABASE_URL="..." npx tsx scripts/check-admin.ts
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function checkAdmin() {
  try {
    console.log('Checking admin@digis.cc...\n');

    const user = await db.query.users.findFirst({
      where: eq(users.email, 'admin@digis.cc'),
    });

    if (!user) {
      console.error('❌ Admin user not found: admin@digis.cc');
      process.exit(1);
    }

    console.log('Admin user details:');
    console.log('  Email:', user.email);
    console.log('  Username:', user.username || '❌ NOT SET');
    console.log('  Display Name:', user.displayName || 'NOT SET');
    console.log('  Role:', user.role);
    console.log('  Verified:', user.isCreatorVerified || false);
    console.log();

    if (!user.username) {
      console.log('⚠️  Username not set! Setting to "admin"...');

      await db.update(users)
        .set({
          username: 'admin',
          displayName: user.displayName || 'Admin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      console.log('✅ Username set to "admin"');
      console.log('✅ Admin should now be able to access admin panel');
      console.log('\nℹ️  Please log out and log back in for changes to take effect');
    } else {
      console.log('✅ Username is set - admin account looks good');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdmin();
