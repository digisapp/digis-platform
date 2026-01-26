import postgres from 'postgres';

const connectionString = (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '')
  .replace('postgres://', 'postgresql://');

if (!connectionString) {
  console.error('❌ DATABASE_URL or DIRECT_DATABASE_URL not found');
  console.error('Set it with: DATABASE_URL="..." npx tsx scripts/create-referral-indexes.ts');
  process.exit(1);
}

console.log('Connecting to database...');

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 30,
  max: 1
});

async function applyIndexes() {
  console.log('🔧 Applying referral performance indexes...\n');

  const indexes = [
    {
      name: 'referrals_referrer_id_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id)`,
      description: 'Referrals by referrer'
    },
    {
      name: 'referrals_referred_id_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referrals_referred_id_idx ON referrals(referred_id)`,
      description: 'Referrals by referred user'
    },
    {
      name: 'referrals_referral_code_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referrals_referral_code_idx ON referrals(referral_code)`,
      description: 'Referrals by code lookup'
    },
    {
      name: 'referrals_status_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referrals_status_idx ON referrals(status)`,
      description: 'Referrals by status'
    },
    {
      name: 'referral_commissions_referral_id_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referral_commissions_referral_id_idx ON referral_commissions(referral_id)`,
      description: 'Commissions by referral'
    },
    {
      name: 'referral_commissions_period_month_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referral_commissions_period_month_idx ON referral_commissions(period_month)`,
      description: 'Commissions by period'
    },
    {
      name: 'referral_commissions_status_idx',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS referral_commissions_status_idx ON referral_commissions(status)`,
      description: 'Commissions by status'
    }
  ];

  for (const index of indexes) {
    try {
      console.log(`⏳ Creating ${index.name}...`);
      await sql.unsafe(index.sql);
      console.log(`✅ Created: ${index.name}`);
      console.log(`   ${index.description}\n`);
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log(`ℹ️  Skipped: ${index.name} (already exists)\n`);
      } else {
        console.log(`❌ Error on ${index.name}: ${err.message}\n`);
      }
    }
  }

  console.log('\n✨ Referral index creation complete!');
  await sql.end();
}

applyIndexes().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
