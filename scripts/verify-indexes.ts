import postgres from 'postgres';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function verifyIndexes() {
  console.log('🔍 Verifying performance indexes...\n');

  // TypeScript: connectionString is guaranteed to be defined due to exit above
  const client = postgres(connectionString!, { max: 1 });

  try {
    const indexes = await client`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `;

    console.log(`✅ Found ${indexes.length} performance indexes:\n`);

    let currentTable = '';
    for (const idx of indexes) {
      if (idx.tablename !== currentTable) {
        currentTable = idx.tablename;
        console.log(`\n📊 ${currentTable}:`);
      }
      console.log(`  ✓ ${idx.indexname}`);
    }

    // Check for pg_trgm extension
    const extensions = await client`
      SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
    `;

    if (extensions.length > 0) {
      console.log('\n✅ pg_trgm extension installed (enables fast text search)');
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyIndexes();
