/**
 * List all users with optional search
 * Usage: DATABASE_URL="..." npx tsx scripts/list-users.ts [search_term]
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import { or, ilike, desc } from 'drizzle-orm';

const search = process.argv[2];

async function listUsers() {
  try {
    let usersList;

    if (search) {
      console.log(`Searching for users matching: "${search}"\n`);
      usersList = await db.query.users.findMany({
        where: or(
          ilike(users.email, `%${search}%`),
          ilike(users.username, `%${search}%`),
          ilike(users.displayName, `%${search}%`)
        ),
        orderBy: desc(users.createdAt),
        limit: 50,
      });
    } else {
      console.log('Listing all users (most recent 20):\n');
      usersList = await db.query.users.findMany({
        orderBy: desc(users.createdAt),
        limit: 20,
      });
    }

    if (usersList.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }

    console.log(`Found ${usersList.length} user(s):\n`);

    usersList.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   Username: @${user.username || 'NOT SET'}`);
      console.log(`   Display Name: ${user.displayName || 'NOT SET'}`);
      console.log(`   Role: ${user.role}${user.isCreatorVerified ? ' (verified)' : ''}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listUsers();
