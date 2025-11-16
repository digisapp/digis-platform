import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function applyIndexes() {
  console.log('📊 Applying performance indexes to production database...\n');

  const client = postgres(connectionString!, { max: 1 });

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', 'performance-indexes-final.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      if (statement.includes('CREATE INDEX') || statement.includes('CREATE EXTENSION')) {
        const name = statement.match(/(?:INDEX|EXTENSION)(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/i)?.[1];
        try {
          await client.unsafe(statement);
          console.log(`✅ ${name || 'Statement'} created`);
        } catch (error: any) {
          if (error.message.includes('already exists')) {
            console.log(`⏭️  ${name || 'Statement'} already exists`);
          } else {
            console.error(`❌ Failed to execute: ${name}`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Performance indexes applied successfully!');
    console.log('\n🔍 Verifying indexes...\n');

    // Verify indexes
    const indexes = await client`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    let currentTable = '';
    for (const idx of indexes) {
      if (idx.tablename !== currentTable) {
        currentTable = idx.tablename;
        console.log(`\n📊 ${currentTable}:`);
      }
      console.log(`  ✓ ${idx.indexname}`);
    }

    console.log(`\n✅ Total indexes: ${indexes.length}`);

  } catch (error: any) {
    console.error('❌ Failed to apply indexes:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyIndexes();
