import { createClient } from '@supabase/supabase-js';

const client = createClient(
  'https://udpolhavhefflrawpokb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkcG9saGF2aGVmZmxyYXdwb2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQwMDU5OCwiZXhwIjoyMDc3OTc2NTk4fQ.K60IX9-GaFH9-RyYDVebzGQScQHFP7netuJbDl13B-c'
);

async function checkUser() {
  const { data: user, error } = await client
    .from('users')
    .select('id, email, username, role, is_creator_verified, display_name')
    .eq('email', 'miriam@examodels.com')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('User data:', JSON.stringify(user, null, 2));
  }
}

checkUser();
