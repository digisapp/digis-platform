import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function fixStorageBucket() {
  console.log('🔧 Fixing content storage bucket configuration...\n');

  const client = postgres(connectionString!, { max: 1 });

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'scripts', 'fix-storage-bucket.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      const isInsert = statement.includes('INSERT INTO');
      const isDrop = statement.includes('DROP POLICY');
      const isAlter = statement.includes('ALTER TABLE');
      const isCreate = statement.includes('CREATE POLICY');

      let name = 'statement';
      if (isInsert) {
        name = 'Insert/update content bucket';
      } else if (isDrop) {
        name = statement.match(/"([^"]+)"/)?.[1] || 'policy';
      } else if (isAlter) {
        name = 'Enable RLS on storage.objects';
      } else if (isCreate) {
        name = statement.match(/CREATE POLICY "([^"]+)"/)?.[1] || 'policy';
      }

      try {
        await client.unsafe(statement);
        console.log(`✅ ${name}`);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`⏭️  ${name} (skipped)`);
        } else {
          console.error(`❌ ${name} failed:`, error.message);
        }
      }
    }

    console.log('\n✅ Storage bucket configuration complete!');

    // Verify bucket settings
    console.log('\n🔍 Verifying bucket configuration...\n');

    const buckets = await client`
      SELECT id, name, public
      FROM storage.buckets
      WHERE id = 'content';
    `;

    if (buckets.length > 0) {
      const bucket = buckets[0];
      console.log(`📦 Bucket: ${bucket.name}`);
      console.log(`   Public: ${bucket.public ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ Content bucket not found!');
    }

    // Check policies
    const policies = await client`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'objects'
        AND schemaname = 'storage'
      ORDER BY policyname;
    `;

    console.log(`\n🔒 Storage policies: ${policies.length}`);
    for (const p of policies) {
      console.log(`   ✓ ${p.policyname} (${p.cmd})`);
    }

  } catch (error: any) {
    console.error('❌ Failed to fix storage bucket:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixStorageBucket();
