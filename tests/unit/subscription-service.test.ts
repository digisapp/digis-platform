/**
 * SubscriptionService Test Suite
 *
 * Tests: upsertSubscriptionTier, getCreatorTiers, subscribe,
 * cancelSubscription, isSubscribed, getUserSubscription,
 * renewSubscription, processRenewals, toggleAutoRenew.
 *
 * Focuses on financial correctness: double-entry ledger, balance checks,
 * insufficient balance, idempotency, and batch renewal processing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      subscriptionTiers: { findFirst: vi.fn(), findMany: vi.fn() },
      subscriptions: { findFirst: vi.fn(), findMany: vi.fn() },
      users: { findFirst: vi.fn() },
      wallets: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'new-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'updated-id' }])),
        })),
      })),
    })),
    transaction: vi.fn(),
  },
  subscriptionTiers: {
    id: 'id',
    creatorId: 'creator_id',
    tier: 'tier',
    isActive: 'is_active',
    displayOrder: 'display_order',
    pricePerMonth: 'price_per_month',
    subscriberCount: 'subscriber_count',
  },
  subscriptions: {
    id: 'id',
    userId: 'user_id',
    creatorId: 'creator_id',
    status: 'status',
    expiresAt: 'expires_at',
    tierId: 'tier_id',
    autoRenew: 'auto_renew',
    nextBillingAt: 'next_billing_at',
    createdAt: 'created_at',
    startedAt: 'started_at',
    totalPaid: 'total_paid',
    failedPaymentCount: 'failed_payment_count',
  },
  subscriptionPayments: {},
  users: { id: 'id' },
  walletTransactions: { id: 'id', idempotencyKey: 'idempotency_key' },
  wallets: { userId: 'user_id', balance: 'balance', heldBalance: 'held_balance' },
}));

vi.mock('./notification-service', () => ({
  NotificationService: {
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

import { db } from '@/lib/data/system';
import { SubscriptionService } from '@/lib/services/subscription-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockTx() {
  const tx = {
    query: {
      wallets: { findFirst: vi.fn() },
      walletTransactions: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'tx-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'updated' }])),
        })),
      })),
    })),
  };
  return tx;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SubscriptionService', () => {
  describe('upsertSubscriptionTier', () => {
    it('creates a new tier when none exists', async () => {
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue(null);
      const mockReturning = vi.fn(() => Promise.resolve([{
        id: 'tier-1', creatorId: 'creator-1', name: 'Basic', tier: 'basic', pricePerMonth: 50,
      }]));
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({ returning: mockReturning })),
      });

      const result = await SubscriptionService.upsertSubscriptionTier('creator-1', {
        name: 'Basic', tier: 'basic', pricePerMonth: 50,
      });

      expect(result).toEqual(expect.objectContaining({ id: 'tier-1' }));
      expect(db.insert).toHaveBeenCalled();
    });

    it('updates an existing tier', async () => {
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', creatorId: 'creator-1', tier: 'basic',
      });
      const mockReturning = vi.fn(() => Promise.resolve([{
        id: 'tier-1', name: 'Updated', pricePerMonth: 100,
      }]));
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      });

      const result = await SubscriptionService.upsertSubscriptionTier('creator-1', {
        name: 'Updated', tier: 'basic', pricePerMonth: 100,
      });

      expect(result).toEqual(expect.objectContaining({ id: 'tier-1' }));
      expect(db.update).toHaveBeenCalled();
    });

    it('serializes benefits as JSON', async () => {
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue(null);
      const mockValues = vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 'tier-1' }])) }));
      (db.insert as any).mockReturnValue({ values: mockValues });

      await SubscriptionService.upsertSubscriptionTier('creator-1', {
        name: 'Premium', tier: 'gold', pricePerMonth: 200,
        benefits: ['Exclusive content', 'DM access'],
      });

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        benefits: JSON.stringify(['Exclusive content', 'DM access']),
      }));
    });
  });

  describe('getCreatorTiers', () => {
    it('returns existing tiers with parsed benefits', async () => {
      (db.query.subscriptionTiers.findMany as any).mockResolvedValue([
        { id: 'tier-1', name: 'Basic', benefits: '["Perk 1","Perk 2"]' },
      ]);

      const result = await SubscriptionService.getCreatorTiers('creator-1');

      expect(result).toHaveLength(1);
      expect(result[0].benefits).toEqual(['Perk 1', 'Perk 2']);
    });

    it('auto-creates a default tier when none exist', async () => {
      (db.query.subscriptionTiers.findMany as any).mockResolvedValue([]);
      const mockReturning = vi.fn(() => Promise.resolve([{
        id: 'default-tier', name: 'Subscriber', tier: 'basic',
        pricePerMonth: 50, benefits: JSON.stringify(['Exclusive content access', 'Subscriber badge']),
      }]));
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({ returning: mockReturning })),
      });

      const result = await SubscriptionService.getCreatorTiers('creator-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Subscriber');
      expect(result[0].pricePerMonth).toBe(50);
      expect(db.insert).toHaveBeenCalled();
    });

    it('handles null benefits gracefully', async () => {
      (db.query.subscriptionTiers.findMany as any).mockResolvedValue([
        { id: 'tier-1', name: 'Basic', benefits: null },
      ]);

      const result = await SubscriptionService.getCreatorTiers('creator-1');
      expect(result[0].benefits).toEqual([]);
    });
  });

  describe('subscribe', () => {
    it('throws when already subscribed', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', status: 'active',
      });

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('Already subscribed to this creator');
    });

    it('throws when tier not found', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue(null);

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('Subscription tier not found or inactive');
    });

    it('throws when tier is inactive', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', isActive: false, creatorId: 'creator-1',
      });

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('Subscription tier not found or inactive');
    });

    it('throws when tier belongs to different creator', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', isActive: true, creatorId: 'other-creator',
      });

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('Tier does not belong to this creator');
    });

    it('throws INSUFFICIENT_BALANCE when not enough coins', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', isActive: true, creatorId: 'creator-1', pricePerMonth: 100,
      });
      (db.query.users.findFirst as any).mockResolvedValue({ username: 'testuser' });

      const mockTx = createMockTx();
      mockTx.query.wallets.findFirst.mockResolvedValue({
        userId: 'user-1', balance: 50, heldBalance: 0,
      });
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('INSUFFICIENT_BALANCE');
    });

    it('throws when wallet not found', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', isActive: true, creatorId: 'creator-1', pricePerMonth: 50,
      });
      (db.query.users.findFirst as any).mockResolvedValue({ username: 'testuser' });

      const mockTx = createMockTx();
      mockTx.query.wallets.findFirst.mockResolvedValue(null);
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('Wallet not found');
    });

    it('considers held balance when checking available coins', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', isActive: true, creatorId: 'creator-1', pricePerMonth: 100,
      });
      (db.query.users.findFirst as any).mockResolvedValue({ username: 'testuser' });

      const mockTx = createMockTx();
      // 150 total but 100 held = 50 available, need 100
      mockTx.query.wallets.findFirst.mockResolvedValue({
        userId: 'user-1', balance: 150, heldBalance: 100,
      });
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      await expect(
        SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1')
      ).rejects.toThrow('INSUFFICIENT_BALANCE');
    });

    it('creates subscription with double-entry transactions on success', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);
      (db.query.subscriptionTiers.findFirst as any).mockResolvedValue({
        id: 'tier-1', isActive: true, creatorId: 'creator-1', pricePerMonth: 50, name: 'Basic',
      });
      (db.query.users.findFirst as any).mockResolvedValue({ username: 'testuser' });

      const mockTx = createMockTx();
      mockTx.query.wallets.findFirst.mockResolvedValue({
        userId: 'user-1', balance: 200, heldBalance: 0,
      });

      let insertCount = 0;
      mockTx.insert.mockImplementation(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: `record-${++insertCount}` }])),
        })),
      }));

      const mockUpdateWhere = vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'sub-1' }])),
      }));
      mockTx.update.mockReturnValue({
        set: vi.fn(() => ({ where: mockUpdateWhere })),
      });

      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await SubscriptionService.subscribe('user-1', 'creator-1', 'tier-1');

      // Should have multiple inserts: user tx, creator tx, subscription, payment, tier update
      expect(mockTx.insert).toHaveBeenCalled();
      expect(insertCount).toBeGreaterThanOrEqual(3); // at minimum: user tx, creator tx, subscription
    });
  });

  describe('cancelSubscription', () => {
    it('cancels an active subscription', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-1', status: 'active', tierId: 'tier-1',
      });
      const mockReturning = vi.fn(() => Promise.resolve([{
        id: 'sub-1', status: 'cancelled',
      }]));
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      });

      const result = await SubscriptionService.cancelSubscription('user-1', 'sub-1');
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('throws when subscription not found', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);

      await expect(
        SubscriptionService.cancelSubscription('user-1', 'sub-1')
      ).rejects.toThrow('Subscription not found');
    });

    it('throws when wrong user tries to cancel', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-2', status: 'active',
      });

      await expect(
        SubscriptionService.cancelSubscription('user-1', 'sub-1')
      ).rejects.toThrow('Not authorized to cancel this subscription');
    });

    it('throws when subscription is not active', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-1', status: 'cancelled',
      });

      await expect(
        SubscriptionService.cancelSubscription('user-1', 'sub-1')
      ).rejects.toThrow('Subscription is not active');
    });
  });

  describe('isSubscribed', () => {
    it('returns true when actively subscribed', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', status: 'active',
      });

      const result = await SubscriptionService.isSubscribed('user-1', 'creator-1');
      expect(result).toBe(true);
    });

    it('returns false when not subscribed', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);

      const result = await SubscriptionService.isSubscribed('user-1', 'creator-1');
      expect(result).toBe(false);
    });
  });

  describe('getUserSubscription', () => {
    it('returns subscription with tier when found', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', status: 'active', tier: { name: 'Gold', pricePerMonth: 200 },
      });

      const result = await SubscriptionService.getUserSubscription('user-1', 'creator-1');
      expect(result).toEqual(expect.objectContaining({
        id: 'sub-1',
        tier: expect.objectContaining({ name: 'Gold' }),
      }));
    });

    it('returns null when no subscription', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);

      const result = await SubscriptionService.getUserSubscription('user-1', 'creator-1');
      expect(result).toBeNull();
    });
  });

  describe('renewSubscription', () => {
    it('throws when subscription not found', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);

      await expect(
        SubscriptionService.renewSubscription('sub-1')
      ).rejects.toThrow('Subscription not found');
    });

    it('throws when tier is missing', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', status: 'active', autoRenew: true, tier: null,
      });

      await expect(
        SubscriptionService.renewSubscription('sub-1')
      ).rejects.toThrow('Subscription tier not found');
    });

    it('throws when subscription is not active', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', status: 'cancelled', autoRenew: true,
        tier: { pricePerMonth: 50, name: 'Basic' },
      });

      await expect(
        SubscriptionService.renewSubscription('sub-1')
      ).rejects.toThrow('Subscription is not active');
    });

    it('throws when auto-renew is disabled', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', status: 'active', autoRenew: false,
        tier: { pricePerMonth: 50, name: 'Basic' },
      });

      await expect(
        SubscriptionService.renewSubscription('sub-1')
      ).rejects.toThrow('Auto-renew is disabled');
    });

    it('throws INSUFFICIENT_BALANCE when user cannot afford renewal', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-1', creatorId: 'creator-1',
        status: 'active', autoRenew: true, tierId: 'tier-1',
        expiresAt: new Date(),
        tier: { pricePerMonth: 100, name: 'Gold' },
      });

      const mockTx = createMockTx();
      mockTx.query.wallets.findFirst.mockResolvedValue({
        userId: 'user-1', balance: 30, heldBalance: 0,
      });
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      await expect(
        SubscriptionService.renewSubscription('sub-1')
      ).rejects.toThrow('INSUFFICIENT_BALANCE');
    });

    it('renews successfully with double-entry transactions', async () => {
      const expiresAt = new Date('2025-02-15');
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-1', creatorId: 'creator-1',
        status: 'active', autoRenew: true, tierId: 'tier-1',
        expiresAt,
        tier: { pricePerMonth: 50, name: 'Basic' },
      });

      const mockTx = createMockTx();
      mockTx.query.wallets.findFirst
        .mockResolvedValueOnce({ userId: 'user-1', balance: 200, heldBalance: 0 })
        .mockResolvedValueOnce({ userId: 'creator-1', balance: 500, heldBalance: 0 });

      let insertCount = 0;
      mockTx.insert.mockImplementation(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: `tx-${++insertCount}` }])),
        })),
      }));
      mockTx.update.mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([{}])),
          })),
        })),
      });

      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await SubscriptionService.renewSubscription('sub-1');

      expect(result.success).toBe(true);
      expect(result.amountCharged).toBe(50);
      // New expiry should be 30 days after old expiry
      expect(result.newExpiresAt.getTime()).toBeGreaterThan(expiresAt.getTime());
    });
  });

  describe('processRenewals', () => {
    it('returns zero counts when no subscriptions need renewal', async () => {
      (db.query.subscriptions.findMany as any).mockResolvedValue([]);

      const result = await SubscriptionService.processRenewals();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('processes renewals in batches', async () => {
      // Create 3 subscriptions needing renewal
      const subs = [
        { id: 'sub-1', failedPaymentCount: 0, tier: { pricePerMonth: 50 } },
        { id: 'sub-2', failedPaymentCount: 0, tier: { pricePerMonth: 50 } },
        { id: 'sub-3', failedPaymentCount: 0, tier: { pricePerMonth: 50 } },
      ];
      (db.query.subscriptions.findMany as any).mockResolvedValue(subs);

      // Mock renewSubscription to succeed
      const originalRenew = SubscriptionService.renewSubscription;
      vi.spyOn(SubscriptionService, 'renewSubscription').mockResolvedValue({
        success: true, newExpiresAt: new Date(), amountCharged: 50,
      });

      const result = await SubscriptionService.processRenewals();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);

      vi.mocked(SubscriptionService.renewSubscription).mockRestore();
    });

    it('increments failedPaymentCount on failure', async () => {
      const subs = [
        { id: 'sub-1', failedPaymentCount: 0, tier: { pricePerMonth: 50 } },
      ];
      (db.query.subscriptions.findMany as any).mockResolvedValue(subs);

      vi.spyOn(SubscriptionService, 'renewSubscription').mockRejectedValue(
        new Error('INSUFFICIENT_BALANCE:50:0')
      );

      const mockUpdateSet = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      }));
      (db.update as any).mockReturnValue({ set: mockUpdateSet });

      const result = await SubscriptionService.processRenewals();

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);

      vi.mocked(SubscriptionService.renewSubscription).mockRestore();
    });

    it('auto-cancels subscription after 3 failed payments', async () => {
      const subs = [
        { id: 'sub-1', failedPaymentCount: 2, tier: { pricePerMonth: 50 } },
      ];
      (db.query.subscriptions.findMany as any).mockResolvedValue(subs);

      vi.spyOn(SubscriptionService, 'renewSubscription').mockRejectedValue(
        new Error('INSUFFICIENT_BALANCE')
      );

      const mockUpdateSet = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      }));
      (db.update as any).mockReturnValue({ set: mockUpdateSet });

      const result = await SubscriptionService.processRenewals();

      expect(result.failed).toBe(1);
      // Should have called update twice: once for failedPaymentCount, once for cancellation
      expect(db.update).toHaveBeenCalledTimes(2);

      vi.mocked(SubscriptionService.renewSubscription).mockRestore();
    });
  });

  describe('toggleAutoRenew', () => {
    it('toggles auto-renew on', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-1', autoRenew: false,
      });
      const mockReturning = vi.fn(() => Promise.resolve([{
        id: 'sub-1', autoRenew: true,
      }]));
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      });

      const result = await SubscriptionService.toggleAutoRenew('user-1', 'sub-1', true);
      expect(result).toEqual(expect.objectContaining({ autoRenew: true }));
    });

    it('throws when subscription not found', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue(null);

      await expect(
        SubscriptionService.toggleAutoRenew('user-1', 'sub-1', true)
      ).rejects.toThrow('Subscription not found');
    });

    it('throws when wrong user', async () => {
      (db.query.subscriptions.findFirst as any).mockResolvedValue({
        id: 'sub-1', userId: 'user-2',
      });

      await expect(
        SubscriptionService.toggleAutoRenew('user-1', 'sub-1', true)
      ).rejects.toThrow('Not authorized to modify this subscription');
    });
  });

  describe('getCreatorStats', () => {
    it('returns aggregate stats for a creator', async () => {
      (db.query.subscriptions.findMany as any).mockResolvedValue([
        { id: 'sub-1', totalPaid: 100 },
        { id: 'sub-2', totalPaid: 200 },
        { id: 'sub-3', totalPaid: 150 },
      ]);

      const result = await SubscriptionService.getCreatorStats('creator-1');

      expect(result.totalSubscribers).toBe(3);
      expect(result.totalRevenue).toBe(450);
      expect(result.activeSubscriptions).toBe(3);
    });

    it('returns zero stats when no subscribers', async () => {
      (db.query.subscriptions.findMany as any).mockResolvedValue([]);

      const result = await SubscriptionService.getCreatorStats('creator-1');

      expect(result.totalSubscribers).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });
});
