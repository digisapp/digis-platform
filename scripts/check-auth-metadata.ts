import { createClient } from '@supabase/supabase-js';

async function checkAuthMetadata() {
  const supabaseUrl = 'https://udpolhavhefflrawpokb.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcG9saGF2aGVmZmxyYXdwb2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0NjE0NiwiZXhwIjoyMDc4MTA2MTQ2fQ.8JTu6S3pDeBcBsNBhZoYncwLHREhHs9Wx9ay63LdVMw';

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Checking auth metadata for miriam@examodels.com...\n');

    // Get user by email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error fetching users:', userError);
      process.exit(1);
    }

    const miriamAuth = userData.users.find((u: any) => u.email === 'miriam@examodels.com');

    if (!miriamAuth) {
      console.log('❌ No auth user found for miriam@examodels.com');
      process.exit(1);
    }

    console.log('✓ Found auth user:');
    console.log('- ID:', miriamAuth.id);
    console.log('- Email:', miriamAuth.email);
    console.log('- Email Confirmed:', miriamAuth.email_confirmed_at ? 'Yes' : 'No');
    console.log('- Created:', miriamAuth.created_at);
    console.log('- Last Sign In:', miriamAuth.last_sign_in_at);
    console.log('\n--- app_metadata ---');
    console.log(JSON.stringify(miriamAuth.app_metadata, null, 2));
    console.log('\n--- user_metadata ---');
    console.log(JSON.stringify(miriamAuth.user_metadata, null, 2));

    // Check if role is in metadata
    const appRole = miriamAuth.app_metadata?.role;
    const userRole = miriamAuth.user_metadata?.role;

    console.log('\n--- Role Status ---');
    console.log('- app_metadata.role:', appRole || '(not set)');
    console.log('- user_metadata.role:', userRole || '(not set)');

    if (!appRole && !userRole) {
      console.log('\n⚠️  WARNING: No role in JWT metadata!');
      console.log('This will cause the navigation to default to "fan" role.');
      console.log('The role needs to be backfilled to app_metadata.');
    } else if (appRole !== 'creator') {
      console.log('\n⚠️  WARNING: app_metadata.role is not "creator"!');
      console.log('Expected: creator');
      console.log('Got:', appRole);
    } else {
      console.log('\n✓ Role correctly set in app_metadata');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkAuthMetadata();
