/**
 * Monthly Referral Commission Calculator
 *
 * This script should be run monthly (via cron or Vercel cron) to:
 * 1. Calculate earnings for each referred creator for the past month
 * 2. Calculate 5% commission for the referrer
 * 3. Accumulate pending commissions until they reach 100+ coins
 * 4. Pay out commissions when threshold is reached
 *
 * Run with: npx tsx scripts/calculate-referral-commissions.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || '';

const COMMISSION_PERCENT = 5;
const PAYOUT_THRESHOLD = 100;

async function calculateReferralCommissions() {
  console.log('Starting monthly referral commission calculation...');
  console.log(`Date: ${new Date().toISOString()}`);

  const client = postgres(connectionString, { max: 1 });

  try {
    // Calculate period (previous month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodMonth = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

    console.log(`\nCalculating commissions for period: ${periodMonth}`);
    console.log(`Period start: ${periodStart.toISOString()}`);
    console.log(`Period end: ${periodEnd.toISOString()}`);

    // Get all active referrals that haven't expired
    const activeReferrals = await client`
      SELECT
        r.id,
        r.referrer_id,
        r.referred_id,
        r.revenue_share_percent,
        r.pending_commission,
        r.total_commission_earned,
        u.username as referred_username
      FROM referrals r
      LEFT JOIN users u ON r.referred_id = u.id
      WHERE r.status = 'active'
        AND (r.revenue_share_expires_at IS NULL OR r.revenue_share_expires_at > NOW())
    `;

    console.log(`\nFound ${activeReferrals.length} active referrals to process`);

    let totalCommissionsPaid = 0;
    let totalCommissionsAccumulated = 0;

    for (const referral of activeReferrals) {
      console.log(`\nProcessing referral: ${referral.id}`);
      console.log(`  Referred creator: @${referral.referred_username}`);

      // Check if we already processed this period
      const existingCommission = await client`
        SELECT id FROM referral_commissions
        WHERE referral_id = ${referral.id}
          AND period_month = ${periodMonth}
      `;

      if (existingCommission.length > 0) {
        console.log(`  Already processed for ${periodMonth}, skipping`);
        continue;
      }

      // Calculate referred creator's earnings for the period
      // This includes tips, content purchases, call earnings, etc.
      const earnings = await client`
        SELECT COALESCE(SUM(amount), 0) as total_earnings
        FROM (
          -- Tips/gifts received
          SELECT t.amount
          FROM tips t
          WHERE t.creator_id = ${referral.referred_id}
            AND t.created_at >= ${periodStart}
            AND t.created_at < ${periodEnd}

          UNION ALL

          -- Call earnings (per minute)
          SELECT c.total_cost as amount
          FROM calls c
          WHERE c.creator_id = ${referral.referred_id}
            AND c.status = 'completed'
            AND c.ended_at >= ${periodStart}
            AND c.ended_at < ${periodEnd}

          UNION ALL

          -- Content purchases
          SELECT cp.coins_paid as amount
          FROM content_purchases cp
          JOIN content ct ON cp.content_id = ct.id
          WHERE ct.creator_id = ${referral.referred_id}
            AND cp.created_at >= ${periodStart}
            AND cp.created_at < ${periodEnd}

          UNION ALL

          -- Subscription payments
          SELECT s.price as amount
          FROM subscriptions s
          WHERE s.creator_id = ${referral.referred_id}
            AND s.created_at >= ${periodStart}
            AND s.created_at < ${periodEnd}
        ) as earnings
      `;

      const referredEarnings = parseInt(earnings[0]?.total_earnings || '0');
      console.log(`  Earnings for period: ${referredEarnings} coins`);

      if (referredEarnings === 0) {
        console.log(`  No earnings, skipping`);
        continue;
      }

      // Calculate commission (5%)
      const commissionPercent = parseFloat(referral.revenue_share_percent) || COMMISSION_PERCENT;
      const commissionAmount = Math.floor(referredEarnings * (commissionPercent / 100));
      console.log(`  Commission (${commissionPercent}%): ${commissionAmount} coins`);

      // Create commission record
      await client`
        INSERT INTO referral_commissions (
          referral_id,
          period_month,
          period_start,
          period_end,
          referred_earnings,
          commission_percent,
          commission_amount,
          status
        ) VALUES (
          ${referral.id},
          ${periodMonth},
          ${periodStart},
          ${periodEnd},
          ${referredEarnings},
          ${commissionPercent},
          ${commissionAmount},
          'pending'
        )
      `;

      // Update pending commission on referral
      const newPending = (parseInt(referral.pending_commission) || 0) + commissionAmount;
      console.log(`  New pending total: ${newPending} coins`);

      // Check if we should pay out
      if (newPending >= PAYOUT_THRESHOLD) {
        console.log(`  Threshold reached! Paying out ${newPending} coins to referrer`);

        // Update referrer's wallet
        await client`
          UPDATE wallets
          SET balance = balance + ${newPending},
              updated_at = NOW()
          WHERE user_id = ${referral.referrer_id}
        `;

        // Update referral record
        await client`
          UPDATE referrals
          SET pending_commission = 0,
              total_commission_earned = total_commission_earned + ${newPending},
              updated_at = NOW()
          WHERE id = ${referral.id}
        `;

        // Mark commission as paid
        await client`
          UPDATE referral_commissions
          SET status = 'paid',
              paid_at = NOW(),
              updated_at = NOW()
          WHERE referral_id = ${referral.id}
            AND period_month = ${periodMonth}
        `;

        totalCommissionsPaid += newPending;
        console.log(`  Payout complete!`);
      } else {
        // Just accumulate
        await client`
          UPDATE referrals
          SET pending_commission = ${newPending},
              updated_at = NOW()
          WHERE id = ${referral.id}
        `;

        totalCommissionsAccumulated += commissionAmount;
        console.log(`  Accumulated (below threshold)`);
      }
    }

    // Check for expired referrals
    const expiredReferrals = await client`
      UPDATE referrals
      SET status = 'expired',
          updated_at = NOW()
      WHERE status = 'active'
        AND revenue_share_expires_at IS NOT NULL
        AND revenue_share_expires_at <= NOW()
      RETURNING id
    `;

    console.log(`\n========================================`);
    console.log(`Commission calculation complete!`);
    console.log(`  Total commissions paid out: ${totalCommissionsPaid} coins`);
    console.log(`  Total commissions accumulated: ${totalCommissionsAccumulated} coins`);
    console.log(`  Referrals expired: ${expiredReferrals.length}`);
    console.log(`========================================`);

  } catch (error) {
    console.error('Error calculating commissions:', error);
    throw error;
  } finally {
    await client.end();
  }
}

calculateReferralCommissions().catch(console.error);
