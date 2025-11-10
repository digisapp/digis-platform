/**
 * Check user details by email or username
 * Usage: DATABASE_URL="..." npx tsx scripts/check-user.ts miriam@digis.cc
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq, or } from 'drizzle-orm';

const identifier = process.argv[2];

if (!identifier) {
  console.error('Usage: npx tsx scripts/check-user.ts <email or username>');
  process.exit(1);
}

async function checkUser() {
  try {
    console.log(`Looking for user: ${identifier}\n`);

    const user = await db.query.users.findFirst({
      where: or(
        eq(users.email, identifier),
        eq(users.username, identifier.toLowerCase())
      ),
    });

    if (!user) {
      console.error(`❌ User not found: ${identifier}`);
      process.exit(1);
    }

    console.log('User Details:');
    console.log('  Email:', user.email);
    console.log('  Username:', user.username || '❌ NOT SET');
    console.log('  Display Name:', user.displayName || 'NOT SET');
    console.log('  Role:', user.role);
    console.log('  Creator Verified:', user.isCreatorVerified || false);
    console.log('  Bio:', user.bio || 'NOT SET');
    console.log('  Avatar:', user.avatarUrl || 'NOT SET');
    console.log('  Created:', user.createdAt);
    console.log();

    if (user.role !== 'creator') {
      console.log('⚠️  User is NOT a creator!');
      console.log('   Current role:', user.role);
    } else if (!user.isCreatorVerified) {
      console.log('⚠️  User is a creator but NOT verified');
    } else {
      console.log('✅ User is a verified creator');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser();
