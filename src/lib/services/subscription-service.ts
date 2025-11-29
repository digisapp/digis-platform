import { db } from '@/lib/data/system';
import {
  subscriptionTiers,
  subscriptions,
  subscriptionPayments,
  users,
  walletTransactions,
  wallets,
} from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export class SubscriptionService {
  /**
   * Create or update a subscription tier for a creator
   */
  static async upsertSubscriptionTier(
    creatorId: string,
    data: {
      name: string;
      tier: 'basic' | 'bronze' | 'silver' | 'gold' | 'platinum';
      description?: string;
      pricePerMonth: number;
      benefits?: string[];
    }
  ) {
    // Check if tier already exists for this creator
    const existing = await db.query.subscriptionTiers.findFirst({
      where: and(
        eq(subscriptionTiers.creatorId, creatorId),
        eq(subscriptionTiers.tier, data.tier)
      ),
    });

    const benefitsJson = data.benefits ? JSON.stringify(data.benefits) : null;

    if (existing) {
      // Update existing tier
      const [updated] = await db
        .update(subscriptionTiers)
        .set({
          name: data.name,
          description: data.description,
          pricePerMonth: data.pricePerMonth,
          benefits: benefitsJson,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionTiers.id, existing.id))
        .returning();

      return updated;
    } else {
      // Create new tier
      const [newTier] = await db
        .insert(subscriptionTiers)
        .values({
          creatorId,
          name: data.name,
          tier: data.tier,
          description: data.description,
          pricePerMonth: data.pricePerMonth,
          benefits: benefitsJson,
          isActive: true,
          displayOrder: 0,
        })
        .returning();

      return newTier;
    }
  }

  /**
   * Get all active tiers for a creator
   */
  static async getCreatorTiers(creatorId: string) {
    const tiers = await db.query.subscriptionTiers.findMany({
      where: and(
        eq(subscriptionTiers.creatorId, creatorId),
        eq(subscriptionTiers.isActive, true)
      ),
      orderBy: [subscriptionTiers.displayOrder, subscriptionTiers.pricePerMonth],
    });

    return tiers.map(tier => ({
      ...tier,
      benefits: tier.benefits ? JSON.parse(tier.benefits) : [],
    }));
  }

  /**
   * Subscribe to a creator's tier
   * Uses database transaction to ensure atomicity of all operations
   */
  static async subscribe(userId: string, creatorId: string, tierId: string) {
    // Pre-validation checks (outside transaction)
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.creatorId, creatorId),
        eq(subscriptions.status, 'active')
      ),
    });

    if (existingSubscription) {
      throw new Error('Already subscribed to this creator');
    }

    const tier = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.id, tierId),
    });

    if (!tier || !tier.isActive) {
      throw new Error('Subscription tier not found or inactive');
    }

    if (tier.creatorId !== creatorId) {
      throw new Error('Tier does not belong to this creator');
    }

    // Get usernames for transaction descriptions
    const [creatorUsername, subscriberUsername] = await Promise.all([
      this.getUsername(creatorId),
      this.getUsername(userId),
    ]);

    // Use transaction for all financial operations
    return await db.transaction(async (tx) => {
      // Get user wallet within transaction
      const userWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!userWallet) {
        throw new Error('Wallet not found. Please contact support.');
      }

      // Check if user has enough coins
      const availableBalance = userWallet.balance - userWallet.heldBalance;
      if (availableBalance < tier.pricePerMonth) {
        throw new Error(`Not enough coins. You need ${tier.pricePerMonth} coins to subscribe.`);
      }

      // Calculate subscription period (30 days from now)
      const startDate = new Date();
      const expiresAt = new Date(startDate);
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create wallet transactions (double-entry)
      const idempotencyKey = `sub_${userId}_${tierId}_${Date.now()}`;

      // Deduct from user
      const [userTransaction] = await tx
        .insert(walletTransactions)
        .values({
          userId,
          amount: -tier.pricePerMonth,
          type: 'subscription_payment',
          status: 'completed',
          description: `Subscription to @${creatorUsername} - ${tier.name}`,
          idempotencyKey,
          metadata: JSON.stringify({ tierId, creatorId }),
        })
        .returning();

      // Credit to creator
      const [creatorTransaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: creatorId,
          amount: tier.pricePerMonth,
          type: 'subscription_earnings',
          status: 'completed',
          description: `Subscription from @${subscriberUsername} - ${tier.name}`,
          relatedTransactionId: userTransaction.id,
          metadata: JSON.stringify({ tierId, subscriberId: userId }),
        })
        .returning();

      // Link transactions
      await tx
        .update(walletTransactions)
        .set({ relatedTransactionId: creatorTransaction.id })
        .where(eq(walletTransactions.id, userTransaction.id));

      // Update user wallet balance (deduct)
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} - ${tier.pricePerMonth}` })
        .where(eq(wallets.userId, userId));

      // Update creator wallet balance (credit)
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${tier.pricePerMonth}` })
        .where(eq(wallets.userId, creatorId));

      // Create subscription record
      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          userId,
          creatorId,
          tierId,
          status: 'active',
          startedAt: startDate,
          expiresAt,
          lastPaymentAt: startDate,
          nextBillingAt: expiresAt,
          totalPaid: tier.pricePerMonth,
          autoRenew: true,
        })
        .returning();

      // Create payment record
      await tx.insert(subscriptionPayments).values({
        subscriptionId: subscription.id,
        userId,
        creatorId,
        amount: tier.pricePerMonth,
        status: 'completed',
        transactionId: userTransaction.id,
        billingPeriodStart: startDate,
        billingPeriodEnd: expiresAt,
        paidAt: startDate,
      });

      // Increment tier subscriber count
      await tx
        .update(subscriptionTiers)
        .set({
          subscriberCount: sql`${subscriptionTiers.subscriberCount} + 1`,
        })
        .where(eq(subscriptionTiers.id, tierId));

      return subscription;
    });
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new Error('Not authorized to cancel this subscription');
    }

    if (subscription.status !== 'active') {
      throw new Error('Subscription is not active');
    }

    // Update subscription status (still active until expiry)
    const [updated] = await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        autoRenew: false,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    // Decrement tier subscriber count
    await db
      .update(subscriptionTiers)
      .set({
        subscriberCount: sql`${subscriptionTiers.subscriberCount} - 1`,
      })
      .where(eq(subscriptionTiers.id, subscription.tierId));

    return updated;
  }

  /**
   * Check if user is subscribed to a creator
   */
  static async isSubscribed(userId: string, creatorId: string) {
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.creatorId, creatorId),
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.expiresAt} > NOW()`
      ),
    });

    return !!subscription;
  }

  /**
   * Get user's subscription to a creator (if any)
   */
  static async getUserSubscription(userId: string, creatorId: string) {
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.creatorId, creatorId),
        sql`${subscriptions.expiresAt} > NOW()`
      ),
      with: {
        tier: true,
      },
    });

    return subscription;
  }

  /**
   * Get all subscribers for a creator
   */
  static async getCreatorSubscribers(creatorId: string) {
    const subs = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.creatorId, creatorId),
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.expiresAt} > NOW()`
      ),
      with: {
        user: true,
        tier: true,
      },
      orderBy: [desc(subscriptions.startedAt)],
    });

    return subs;
  }

  /**
   * Get all user's subscriptions
   */
  static async getUserSubscriptions(userId: string) {
    const subs = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.userId, userId),
        sql`${subscriptions.expiresAt} > NOW()`
      ),
      with: {
        creator: true,
        tier: true,
      },
      orderBy: [desc(subscriptions.startedAt)],
    });

    return subs;
  }

  /**
   * Get subscription stats for a creator
   */
  static async getCreatorStats(creatorId: string) {
    const activeSubscribers = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.creatorId, creatorId),
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.expiresAt} > NOW()`
      ),
    });

    const totalRevenue = activeSubscribers.reduce((sum, sub) => sum + sub.totalPaid, 0);
    const monthlyRecurring = activeSubscribers.length; // Will need tier prices for exact MRR

    return {
      totalSubscribers: activeSubscribers.length,
      totalRevenue,
      activeSubscriptions: activeSubscribers.length,
    };
  }

  /**
   * Process subscription renewals (called by cron)
   */
  static async processRenewals() {
    const now = new Date();
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    try {
      // Find all subscriptions that need renewal
      const subsToRenew = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.autoRenew, true),
          sql`${subscriptions.nextBillingAt} <= NOW()`
        ),
        with: {
          tier: true,
          user: true,
          creator: true,
        },
      });

      console.log(`[Renewals] Found ${subsToRenew.length} subscriptions to renew`);

      // Process renewals in PARALLEL batches of 10 for better performance
      // This prevents blocking and handles 1000s of renewals efficiently
      const BATCH_SIZE = 10;
      const batches = [];

      for (let i = 0; i < subsToRenew.length; i += BATCH_SIZE) {
        batches.push(subsToRenew.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(async (subscription) => {
            await this.renewSubscription(subscription.id);
            return subscription.id;
          })
        );

        // Process batch results
        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          const subscription = batch[i];
          results.processed++;

          if (result.status === 'fulfilled') {
            results.succeeded++;
            console.log(`[Renewals] ✓ Renewed subscription ${subscription.id}`);
          } else {
            results.failed++;
            const errorMsg = result.reason instanceof Error ? result.reason.message : 'Unknown error';
            results.errors.push(`Sub ${subscription.id}: ${errorMsg}`);
            console.error(`[Renewals] ✗ Failed to renew ${subscription.id}:`, errorMsg);

            // Increment failed payment count
            await db
              .update(subscriptions)
              .set({
                failedPaymentCount: subscription.failedPaymentCount + 1,
              })
              .where(eq(subscriptions.id, subscription.id));

            // If failed 3 times, cancel subscription
            if (subscription.failedPaymentCount >= 2) {
              await db
                .update(subscriptions)
                .set({
                  status: 'cancelled',
                  cancelledAt: now,
                  autoRenew: false,
                })
                .where(eq(subscriptions.id, subscription.id));

              console.log(`[Renewals] ✗ Cancelled subscription ${subscription.id} after 3 failed payments`);
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error('[Renewals] Fatal error processing renewals:', error);
      throw error;
    }
  }

  /**
   * Renew a single subscription
   */
  static async renewSubscription(subscriptionId: string) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
      with: {
        tier: true,
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (!subscription.tier) {
      throw new Error('Subscription tier not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Subscription is not active');
    }

    if (!subscription.autoRenew) {
      throw new Error('Auto-renew is disabled');
    }

    // Get user wallet
    const userWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, subscription.userId),
    });

    if (!userWallet) {
      throw new Error('Wallet not found');
    }

    // Extract tier info for TypeScript narrowing
    // TypeScript doesn't properly narrow Drizzle types, so we use assertion
    const tier = subscription.tier as any;
    const tierPrice = tier.pricePerMonth as number;
    const tierName = tier.name as string;

    // Check if user has enough coins
    const availableBalance = userWallet.balance - userWallet.heldBalance;

    if (availableBalance < tierPrice) {
      throw new Error(`Insufficient balance. Need ${tierPrice} coins, have ${availableBalance}.`);
    }

    // Calculate new billing period
    const now = new Date();
    const newExpiresAt = new Date(subscription.expiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);
    const newNextBillingAt = new Date(newExpiresAt);

    // Create wallet transactions (double-entry)
    const idempotencyKey = `renewal_${subscriptionId}_${Date.now()}`;

    // Deduct from user
    const [userTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId: subscription.userId,
        amount: -tierPrice,
        type: 'subscription_payment',
        status: 'completed',
        description: `Subscription renewal - ${tierName}`,
        idempotencyKey,
        metadata: JSON.stringify({ subscriptionId, tierId: subscription.tierId }),
      })
      .returning();

    // Credit to creator
    const [creatorTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId: subscription.creatorId,
        amount: tierPrice,
        type: 'subscription_earnings',
        status: 'completed',
        description: `Subscription renewal earnings - ${tierName}`,
        relatedTransactionId: userTransaction.id,
        metadata: JSON.stringify({ subscriptionId, subscriberId: subscription.userId }),
      })
      .returning();

    // Link transactions
    await db
      .update(walletTransactions)
      .set({ relatedTransactionId: creatorTransaction.id })
      .where(eq(walletTransactions.id, userTransaction.id));

    // Update wallet balances
    await db
      .update(wallets)
      .set({ balance: userWallet.balance - tierPrice })
      .where(eq(wallets.userId, subscription.userId));

    const creatorWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, subscription.creatorId),
    });

    if (creatorWallet) {
      await db
        .update(wallets)
        .set({ balance: creatorWallet.balance + tierPrice })
        .where(eq(wallets.userId, subscription.creatorId));
    }

    // Update subscription
    await db
      .update(subscriptions)
      .set({
        expiresAt: newExpiresAt,
        nextBillingAt: newNextBillingAt,
        lastPaymentAt: now,
        totalPaid: subscription.totalPaid + tierPrice,
        failedPaymentCount: 0, // Reset failed count on success
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscriptionId));

    // Create payment record
    await db.insert(subscriptionPayments).values({
      subscriptionId: subscription.id,
      userId: subscription.userId,
      creatorId: subscription.creatorId,
      amount: tierPrice,
      status: 'completed',
      transactionId: userTransaction.id,
      billingPeriodStart: subscription.expiresAt,
      billingPeriodEnd: newExpiresAt,
      paidAt: now,
    });

    return {
      success: true,
      newExpiresAt,
      amountCharged: tierPrice,
    };
  }

  /**
   * Toggle auto-renew for a subscription
   */
  static async toggleAutoRenew(userId: string, subscriptionId: string, autoRenew: boolean) {
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new Error('Not authorized to modify this subscription');
    }

    const [updated] = await db
      .update(subscriptions)
      .set({
        autoRenew,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return updated;
  }

  /**
   * Helper: Get username
   */
  private static async getUsername(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user?.username || user?.displayName || 'Unknown';
  }
}
