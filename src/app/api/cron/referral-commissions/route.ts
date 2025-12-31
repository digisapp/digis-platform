import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { referrals, referralCommissions } from '@/db/schema/referrals';
import { wallets, walletTransactions } from '@/db/schema';
import { eq, and, gte, lt, sql, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

const COMMISSION_PERCENT = 5;
const PAYOUT_THRESHOLD = 100;

// POST /api/cron/referral-commissions - Calculate monthly commissions
// Secured by CRON_SECRET header for Vercel Cron
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel Cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cron] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting monthly referral commission calculation...');

    // Calculate period (previous month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodMonth = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[Cron] Period: ${periodMonth}`);

    // Get all active referrals
    const activeReferrals = await db.query.referrals.findMany({
      where: and(
        eq(referrals.status, 'active'),
        sql`(${referrals.revenueShareExpiresAt} IS NULL OR ${referrals.revenueShareExpiresAt} > NOW())`
      ),
      with: {
        referred: {
          columns: { id: true, username: true },
        },
      },
    });

    console.log(`[Cron] Processing ${activeReferrals.length} active referrals`);

    let processed = 0;
    let commissionsPaid = 0;
    let commissionsAccumulated = 0;

    for (const referral of activeReferrals) {
      if (!referral.referredId) continue;

      // Check if already processed
      const existing = await db.query.referralCommissions.findFirst({
        where: and(
          eq(referralCommissions.referralId, referral.id),
          eq(referralCommissions.periodMonth, periodMonth)
        ),
      });

      if (existing) {
        console.log(`[Cron] Referral ${referral.id} already processed for ${periodMonth}`);
        continue;
      }

      // Calculate earnings from wallet transactions (all earning types)
      // Types that represent creator earnings
      const earningTypes = [
        'call_earnings',
        'message_earnings',
        'stream_tip',
        'dm_tip',
        'gift',
        'ppv_unlock',
        'subscription_earnings',
        'ai_session_earnings',
        'ai_text_earnings',
      ];

      const earningsResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)` })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.userId, referral.referredId),
            eq(walletTransactions.status, 'completed'),
            gte(walletTransactions.createdAt, periodStart),
            lt(walletTransactions.createdAt, periodEnd),
            inArray(walletTransactions.type, earningTypes as any)
          )
        );

      const referredEarnings = Number(earningsResult[0]?.total || 0);

      if (referredEarnings === 0) {
        console.log(`[Cron] Referral ${referral.id}: No earnings for period`);
        continue;
      }

      const commissionPercent = Number(referral.revenueSharePercent) || COMMISSION_PERCENT;
      const commissionAmount = Math.floor(referredEarnings * (commissionPercent / 100));

      console.log(`[Cron] Referral ${referral.id}: Earnings ${referredEarnings}, Commission ${commissionAmount}`);

      // Create commission record
      await db.insert(referralCommissions).values({
        referralId: referral.id,
        periodMonth,
        periodStart,
        periodEnd,
        referredEarnings,
        commissionPercent: commissionPercent.toString(),
        commissionAmount,
        status: 'pending',
      });

      // Update pending commission
      const newPending = (referral.pendingCommission || 0) + commissionAmount;

      if (newPending >= PAYOUT_THRESHOLD) {
        // Pay out
        const referrerWallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, referral.referrerId),
        });

        if (referrerWallet) {
          await db.update(wallets)
            .set({
              balance: referrerWallet.balance + newPending,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, referral.referrerId));
        } else {
          await db.insert(wallets).values({
            userId: referral.referrerId,
            balance: newPending,
          });
        }

        await db.update(referrals)
          .set({
            pendingCommission: 0,
            totalCommissionEarned: (referral.totalCommissionEarned || 0) + newPending,
            updatedAt: new Date(),
          })
          .where(eq(referrals.id, referral.id));

        await db.update(referralCommissions)
          .set({
            status: 'paid',
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(referralCommissions.referralId, referral.id),
              eq(referralCommissions.periodMonth, periodMonth)
            )
          );

        commissionsPaid += newPending;
        console.log(`[Cron] Paid out ${newPending} coins to referrer ${referral.referrerId}`);
      } else {
        // Accumulate
        await db.update(referrals)
          .set({
            pendingCommission: newPending,
            updatedAt: new Date(),
          })
          .where(eq(referrals.id, referral.id));

        commissionsAccumulated += commissionAmount;
      }

      processed++;
    }

    // Expire old referrals
    await db.update(referrals)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(referrals.status, 'active'),
          sql`${referrals.revenueShareExpiresAt} IS NOT NULL AND ${referrals.revenueShareExpiresAt} <= NOW()`
        )
      );

    console.log(`[Cron] Complete! Processed: ${processed}, Paid: ${commissionsPaid}, Accumulated: ${commissionsAccumulated}`);

    return NextResponse.json({
      success: true,
      period: periodMonth,
      processed,
      commissionsPaid,
      commissionsAccumulated,
    });
  } catch (error: any) {
    console.error('[Cron] Error calculating commissions:', error);
    return NextResponse.json(
      { error: 'Failed to calculate commissions' },
      { status: 500 }
    );
  }
}

// Also support GET for manual triggering (with auth)
export async function GET(request: NextRequest) {
  return POST(request);
}
