/**
 * Set a user as admin by email
 * Usage: npx tsx scripts/set-admin.ts admin@digis.cc
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/set-admin.ts <email>');
  process.exit(1);
}

async function setAdmin() {
  try {
    console.log(`Looking for user: ${email}`);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.displayName || user.username || user.email}`);
    console.log(`Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✅ User is already an admin');
      process.exit(0);
    }

    // Update to admin
    await db.update(users)
      .set({
        role: 'admin',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log('✅ User is now an admin!');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: @${user.username}`);
    console.log(`   Role: admin`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdmin();
