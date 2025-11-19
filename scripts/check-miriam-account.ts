import { db } from '../src/lib/data/system';
import { users } from '../src/lib/data/system';
import { eq } from 'drizzle-orm';

async function checkMiriamAccount() {
  try {
    console.log('Searching for Miriam account...\n');

    // Search by username
    const userByUsername = await db.query.users.findFirst({
      where: eq(users.username, 'miriam'),
    });

    if (userByUsername) {
      console.log('Found user by username "miriam":');
      console.log('- ID:', userByUsername.id);
      console.log('- Email:', userByUsername.email);
      console.log('- Username:', userByUsername.username);
      console.log('- Display Name:', userByUsername.displayName);
      console.log('- Role:', userByUsername.role);
      console.log('- Is Creator Verified:', userByUsername.isCreatorVerified);
      console.log('- Created At:', userByUsername.createdAt);
    } else {
      console.log('No user found with username "miriam"');
    }

    console.log('\n---\n');

    // Search by email
    const userByEmail = await db.query.users.findFirst({
      where: eq(users.email, 'miriam@examodels.com'),
    });

    if (userByEmail) {
      console.log('Found user by email "miriam@examodels.com":');
      console.log('- ID:', userByEmail.id);
      console.log('- Email:', userByEmail.email);
      console.log('- Username:', userByEmail.username);
      console.log('- Display Name:', userByEmail.displayName);
      console.log('- Role:', userByEmail.role);
      console.log('- Is Creator Verified:', userByEmail.isCreatorVerified);
      console.log('- Created At:', userByEmail.createdAt);
    } else {
      console.log('No user found with email "miriam@examodels.com"');
    }

    // Check if they're the same user
    if (userByUsername && userByEmail) {
      if (userByUsername.id === userByEmail.id) {
        console.log('\n✓ Username and email point to the same user');
      } else {
        console.log('\n⚠️  WARNING: Username and email point to DIFFERENT users!');
        console.log('This could cause login confusion.');
      }
    }

  } catch (error) {
    console.error('Error checking Miriam account:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkMiriamAccount();
