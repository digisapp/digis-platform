import postgres from 'postgres';

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ No database URL found');
  process.exit(1);
}

async function checkTriggerUsage() {
  const client = postgres(connectionString!, { max: 1 });

  try {
    console.log('🔍 Checking if update_updated_at_column() function is used by other tables...\n');

    // Check all triggers that use this function
    const triggers = await client`
      SELECT
        event_object_table AS table_name,
        trigger_name,
        event_manipulation AS event
      FROM information_schema.triggers
      WHERE action_statement LIKE '%update_updated_at_column%'
        AND event_object_schema = 'public'
      ORDER BY event_object_table;
    `;

    if (triggers.length === 0) {
      console.log('✅ No triggers found using update_updated_at_column()');
      console.log('   Safe to drop the function.\n');
    } else {
      console.log(`📊 Found ${triggers.length} trigger(s) using update_updated_at_column():\n`);

      for (const trigger of triggers) {
        const isBusiness = trigger.table_name === 'businesses';
        const icon = isBusiness ? '🔴' : '⚠️';
        console.log(`  ${icon} ${trigger.table_name}.${trigger.trigger_name}`);
      }

      const nonBusinessTriggers = triggers.filter(t => t.table_name !== 'businesses');
      if (nonBusinessTriggers.length > 0) {
        console.log('\n⚠️  WARNING: Function is used by other tables!');
        console.log('   DO NOT drop the update_updated_at_column() function.');
      } else {
        console.log('\n✅ Function is only used by businesses table');
        console.log('   Safe to drop the function after removing the table.');
      }
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTriggerUsage();
