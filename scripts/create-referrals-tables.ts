import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Use direct connection (not pgbouncer) for migrations
const connectionString = process.env.DATABASE_URL || '';

async function createReferralsTables() {
  console.log('Creating referrals tables...');

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    // Create enums
    console.log('Creating enums...');

    await client`
      DO $$ BEGIN
        CREATE TYPE referral_status AS ENUM ('pending', 'active', 'expired', 'churned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await client`
      DO $$ BEGIN
        CREATE TYPE commission_status AS ENUM ('pending', 'ready', 'paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    console.log('Enums created');

    // Create referrals table
    console.log('Creating referrals table...');
    await client`
      CREATE TABLE IF NOT EXISTS referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_id UUID REFERENCES users(id) ON DELETE SET NULL,
        referral_code TEXT NOT NULL,
        status referral_status NOT NULL DEFAULT 'pending',
        signup_bonus_paid BOOLEAN NOT NULL DEFAULT false,
        signup_bonus_amount INTEGER NOT NULL DEFAULT 100,
        revenue_share_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
        revenue_share_expires_at TIMESTAMP,
        total_commission_earned INTEGER NOT NULL DEFAULT 0,
        pending_commission INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        activated_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create index on referral_code for fast lookups
    await client`
      CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
    `;

    // Create index on referrer_id for dashboard queries
    await client`
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
    `;

    // Create index on referred_id
    await client`
      CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
    `;

    console.log('Referrals table created');

    // Create referral_commissions table
    console.log('Creating referral_commissions table...');
    await client`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
        period_month TEXT NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        referred_earnings INTEGER NOT NULL DEFAULT 0,
        commission_percent DECIMAL(5,2) NOT NULL,
        commission_amount INTEGER NOT NULL DEFAULT 0,
        status commission_status NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create index for monthly lookups
    await client`
      CREATE INDEX IF NOT EXISTS idx_referral_commissions_period ON referral_commissions(referral_id, period_month);
    `;

    console.log('Referral commissions table created');

    console.log('✅ All referral tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createReferralsTables().catch(console.error);
