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
   */
  static async subscribe(userId: string, creatorId: string, tierId: string) {
    // Check if already subscribed to this creator
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

    // Get tier info
    const tier = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.id, tierId),
    });

    if (!tier || !tier.isActive) {
      throw new Error('Subscription tier not found or inactive');
    }

    if (tier.creatorId !== creatorId) {
      throw new Error('Tier does not belong to this creator');
    }

    // Get user wallet
    const userWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!userWallet) {
      throw new Error('Wallet not found');
    }

    // Check if user has enough coins
    const availableBalance = userWallet.balance - userWallet.heldBalance;
    if (availableBalance < tier.pricePerMonth) {
      throw new Error(`Insufficient balance. Need ${tier.pricePerMonth} coins to subscribe.`);
    }

    // Calculate subscription period (30 days from now)
    const startDate = new Date();
    const expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create wallet transactions (double-entry)
    const idempotencyKey = `sub_${userId}_${tierId}_${Date.now()}`;

    // Deduct from user
    const [userTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId,
        amount: -tier.pricePerMonth,
        type: 'subscription_payment',
        status: 'completed',
        description: `Subscription to @${await this.getUsername(creatorId)} - ${tier.name}`,
        idempotencyKey,
        metadata: JSON.stringify({ tierId, creatorId }),
      })
      .returning();

    // Credit to creator
    const [creatorTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId: creatorId,
        amount: tier.pricePerMonth,
        type: 'subscription_earnings',
        status: 'completed',
        description: `Subscription earnings from @${await this.getUsername(userId)} - ${tier.name}`,
        relatedTransactionId: userTransaction.id,
        metadata: JSON.stringify({ tierId, subscriberId: userId }),
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
      .set({ balance: userWallet.balance - tier.pricePerMonth })
      .where(eq(wallets.userId, userId));

    const creatorWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, creatorId),
    });

    if (creatorWallet) {
      await db
        .update(wallets)
        .set({ balance: creatorWallet.balance + tier.pricePerMonth })
        .where(eq(wallets.userId, creatorId));
    }

    // Create subscription
    const [subscription] = await db
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
        autoRenew: false, // Phase 1: No auto-renew
      })
      .returning();

    // Create payment record
    await db.insert(subscriptionPayments).values({
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
    await db
      .update(subscriptionTiers)
      .set({
        subscriberCount: sql`${subscriptionTiers.subscriberCount} + 1`,
      })
      .where(eq(subscriptionTiers.id, tierId));

    return subscription;
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
   * Helper: Get username
   */
  private static async getUsername(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user?.username || user?.displayName || 'Unknown';
  }
}
