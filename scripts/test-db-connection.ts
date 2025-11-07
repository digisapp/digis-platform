import postgres from 'postgres';

/**
 * Test database connection with the production connection string
 * Run with: npx tsx scripts/test-db-connection.ts
 */
async function testConnection() {
  console.log('Testing database connection...\n');

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
  }

  // Mask password for logging
  const masked = connectionString.replace(/:([^:@]+)@/, '://***:***@');
  console.log('Connection string:', masked);
  console.log('Protocol:', connectionString.split('://')[0] === 'postgresql' ? 'postgresql ✓' : connectionString.split('://')[0] + ' ❌');
  console.log('Port:', connectionString.includes(':6543') ? '6543 (transaction pooler) ✓' : connectionString.includes(':5432') ? '5432 (direct) ⚠️' : 'unknown ❌');
  console.log('Has SSL:', connectionString.includes('sslmode=require') ? '✓' : '❌');
  console.log('\nAttempting connection...\n');

  try {
    const client = postgres(connectionString, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Try a simple query
    const result = await client`SELECT NOW() as time, version() as version`;

    console.log('✅ Connection successful!');
    console.log('Server time:', result[0].time);
    console.log('PostgreSQL version:', result[0].version);

    await client.end();
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error instanceof Error ? error.message : error);

    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
      console.error('\n💡 DNS resolution failed. Check:');
      console.error('   - Is the hostname correct?');
      console.error('   - Is the connection string format correct (postgresql:// not postgres://)?');
    } else if (error instanceof Error && error.message.includes('password')) {
      console.error('\n💡 Authentication failed. Check:');
      console.error('   - Is the password correct?');
      console.error('   - Are there any special characters that need escaping?');
    } else if (error instanceof Error && error.message.includes('timeout')) {
      console.error('\n💡 Connection timeout. Check:');
      console.error('   - Is port 6543 accessible?');
      console.error('   - Is SSL required but not configured?');
    }

    process.exit(1);
  }
}

testConnection();
