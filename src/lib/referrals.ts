import { db } from '@/lib/data/system';
import { referrals } from '@/db/schema/referrals';
import { users, wallets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const SIGNUP_BONUS = 0; // No signup bonus - only commission to prevent fake account abuse
const REVENUE_SHARE_PERCENT = 5;
const COMMISSION_DURATION_MONTHS = 12;

/**
 * Process a referral when a new user signs up
 * Creates a pending referral record if the referral code is valid
 */
export async function processReferralSignup(
  newUserId: string,
  referralCode: string | null
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  if (!referralCode) {
    return { success: false, error: 'No referral code' };
  }

  try {
    // Find the referrer by username
    const referrer = await db.query.users.findFirst({
      where: and(
        eq(users.username, referralCode.toLowerCase()),
        eq(users.role, 'creator')
      ),
      columns: { id: true, username: true },
    });

    if (!referrer) {
      console.log(`[Referral] Invalid referral code: ${referralCode}`);
      return { success: false, error: 'Invalid referral code' };
    }

    // Check if user is trying to refer themselves
    if (referrer.id === newUserId) {
      console.log(`[Referral] User tried to refer themselves: ${newUserId}`);
      return { success: false, error: 'Cannot refer yourself' };
    }

    // Check if this user was already referred
    const existingReferral = await db.query.referrals.findFirst({
      where: eq(referrals.referredId, newUserId),
    });

    if (existingReferral) {
      console.log(`[Referral] User ${newUserId} already has a referral`);
      return { success: false, error: 'User already referred' };
    }

    // Create pending referral record
    const [newReferral] = await db.insert(referrals).values({
      referrerId: referrer.id,
      referredId: newUserId,
      referralCode: referralCode.toLowerCase(),
      status: 'pending',
      signupBonusPaid: false,
      signupBonusAmount: SIGNUP_BONUS,
      revenueSharePercent: REVENUE_SHARE_PERCENT.toString(),
    }).returning();

    console.log(`[Referral] Created pending referral: ${referrer.username} -> ${newUserId}`);

    return { success: true, referralId: newReferral.id };
  } catch (error: any) {
    console.error('[Referral] Error processing signup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Activate a referral when the referred user becomes a creator
 * Pays the signup bonus and sets the commission expiry date
 */
export async function activateReferral(
  referredUserId: string
): Promise<{ success: boolean; bonusPaid?: number; error?: string }> {
  try {
    // Find pending referral for this user
    const referral = await db.query.referrals.findFirst({
      where: and(
        eq(referrals.referredId, referredUserId),
        eq(referrals.status, 'pending')
      ),
    });

    if (!referral) {
      console.log(`[Referral] No pending referral for user: ${referredUserId}`);
      return { success: false, error: 'No pending referral' };
    }

    // Calculate expiry date (12 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + COMMISSION_DURATION_MONTHS);

    // Update referral to active
    await db.update(referrals)
      .set({
        status: 'active',
        activatedAt: new Date(),
        revenueShareExpiresAt: expiresAt,
        signupBonusPaid: true,
        updatedAt: new Date(),
      })
      .where(eq(referrals.id, referral.id));

    // Pay signup bonus to referrer
    const bonusAmount = referral.signupBonusAmount || SIGNUP_BONUS;

    // Get or create referrer's wallet
    const referrerWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, referral.referrerId),
    });

    if (referrerWallet) {
      await db.update(wallets)
        .set({
          balance: referrerWallet.balance + bonusAmount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, referral.referrerId));
    } else {
      await db.insert(wallets).values({
        userId: referral.referrerId,
        balance: bonusAmount,
      });
    }

    console.log(`[Referral] Activated referral and paid ${bonusAmount} coins bonus to referrer ${referral.referrerId}`);

    return { success: true, bonusPaid: bonusAmount };
  } catch (error: any) {
    console.error('[Referral] Error activating referral:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get referral stats for a creator
 */
export async function getReferralStats(creatorId: string) {
  try {
    const creatorReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, creatorId),
    });

    const activeReferrals = creatorReferrals.filter(r => r.status === 'active');
    const pendingReferrals = creatorReferrals.filter(r => r.status === 'pending');
    const totalBonusEarned = creatorReferrals
      .filter(r => r.signupBonusPaid)
      .reduce((sum, r) => sum + (r.signupBonusAmount || 0), 0);
    const totalCommissionEarned = creatorReferrals
      .reduce((sum, r) => sum + (r.totalCommissionEarned || 0), 0);

    return {
      totalReferrals: creatorReferrals.length,
      activeReferrals: activeReferrals.length,
      pendingReferrals: pendingReferrals.length,
      totalBonusEarned,
      totalCommissionEarned,
      totalEarned: totalBonusEarned + totalCommissionEarned,
    };
  } catch (error) {
    console.error('[Referral] Error getting stats:', error);
    return {
      totalReferrals: 0,
      activeReferrals: 0,
      pendingReferrals: 0,
      totalBonusEarned: 0,
      totalCommissionEarned: 0,
      totalEarned: 0,
    };
  }
}

/**
 * Get detailed referral list for a creator
 */
export async function getReferralList(creatorId: string) {
  try {
    const creatorReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, creatorId),
      with: {
        referred: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: (referrals, { desc }) => [desc(referrals.createdAt)],
    });

    return creatorReferrals;
  } catch (error) {
    console.error('[Referral] Error getting list:', error);
    return [];
  }
}
