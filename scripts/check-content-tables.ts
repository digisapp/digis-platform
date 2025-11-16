import postgres from 'postgres';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function checkContentTables() {
  const client = postgres(connectionString!, { max: 1 });

  try {
    const tables = await client`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log('📊 Database Tables:\n');
    for (const t of tables) {
      console.log(`  - ${t.tablename}`);
    }

    // Check if content tables exist
    const contentTables = ['content_items', 'content_purchases', 'content_tags'];
    console.log('\n🔍 Checking content tables:\n');

    for (const tableName of contentTables) {
      const exists = tables.find(t => t.tablename === tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    }

    // Check for content_type enum
    const enums = await client`
      SELECT typname
      FROM pg_type
      WHERE typtype = 'e' AND typname = 'content_type';
    `;

    console.log(`\n  ${enums.length > 0 ? '✅' : '❌'} content_type enum`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkContentTables();
