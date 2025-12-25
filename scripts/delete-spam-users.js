// Script to delete spam users from Supabase Auth and users table
// Usage: node --env-file=.env.local scripts/delete-spam-users.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Spam email patterns to delete
const spamEmails = [
  'nicole.ryan@slclogin.com',
  'maybell5@approject.net',
  'estelle_schultz@gmxxail.com',
  // Add more spam emails here
];

// Suspicious domain patterns
const spamDomains = [
  'slclogin.com',
  'approject.net',
  'gmxxail.com',
  // Add more spam domains here
];

async function deleteSpamUsers() {
  console.log('Checking for spam users...\n');

  // 1. Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching auth users:', authError);
    return;
  }

  console.log(`Total auth users: ${authUsers.users.length}`);

  // 2. Find spam users
  const spamUsers = authUsers.users.filter(user => {
    const email = user.email?.toLowerCase() || '';

    // Check exact email match
    if (spamEmails.some(spam => email === spam.toLowerCase())) {
      return true;
    }

    // Check domain match
    const domain = email.split('@')[1];
    if (spamDomains.includes(domain)) {
      return true;
    }

    return false;
  });

  console.log(`\nFound ${spamUsers.length} spam users:`);
  spamUsers.forEach(u => {
    console.log(`  - ${u.email} (ID: ${u.id.substring(0, 8)}...)`);
  });

  if (spamUsers.length === 0) {
    console.log('\nNo spam users to delete.');
    return;
  }

  console.log('\nDeleting spam users...');

  for (const user of spamUsers) {
    try {
      // Delete from users table first
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = not found, which is fine
        console.log(`  Warning: Could not delete from users table: ${dbError.message}`);
      }

      // Delete from auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (authDeleteError) {
        console.log(`  Error deleting ${user.email}: ${authDeleteError.message}`);
      } else {
        console.log(`  ✓ Deleted: ${user.email}`);
      }
    } catch (err) {
      console.log(`  Error with ${user.email}:`, err.message);
    }
  }

  console.log('\nDone!');
}

deleteSpamUsers();
