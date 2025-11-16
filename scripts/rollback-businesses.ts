import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function rollbackBusinesses() {
  console.log('🗑️  Rolling back businesses table migration...\n');

  const client = postgres(connectionString!, { max: 1 });

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', 'rollback-businesses-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      const isDropPolicy = statement.includes('DROP POLICY');
      const isDropTrigger = statement.includes('DROP TRIGGER');
      const isDropIndex = statement.includes('DROP INDEX');
      const isDropTable = statement.includes('DROP TABLE');
      const isDropFunction = statement.includes('DROP FUNCTION');

      let name = 'statement';
      if (isDropPolicy) {
        name = statement.match(/"([^"]+)"/)?.[1] || 'policy';
      } else if (isDropTrigger) {
        name = statement.match(/TRIGGER\s+IF\s+EXISTS\s+(\w+)/i)?.[1] || 'trigger';
      } else if (isDropIndex) {
        name = statement.match(/INDEX\s+IF\s+EXISTS\s+([\w.]+)/i)?.[1] || 'index';
      } else if (isDropTable) {
        name = statement.match(/TABLE\s+IF\s+EXISTS\s+([\w.]+)/i)?.[1] || 'table';
      } else if (isDropFunction) {
        name = statement.match(/FUNCTION\s+IF\s+EXISTS\s+(\w+)/i)?.[1] || 'function';
      }

      try {
        await client.unsafe(statement);
        console.log(`✅ Dropped ${name}`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.log(`⏭️  ${name} does not exist (already removed)`);
        } else {
          console.error(`❌ Failed to drop ${name}:`, error.message);
        }
      }
    }

    console.log('\n✅ Rollback completed successfully!');

    // Verify the table is gone
    const tables = await client`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'businesses';
    `;

    if (tables.length === 0) {
      console.log('✅ Verified: businesses table has been removed');
    } else {
      console.log('⚠️  Warning: businesses table still exists!');
    }

  } catch (error: any) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

rollbackBusinesses();
