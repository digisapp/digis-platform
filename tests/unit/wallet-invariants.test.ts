/**
 * Wallet / Ledger Invariant Tests
 *
 * Tests critical financial invariants that MUST hold true:
 * 1. Balance never goes negative
 * 2. Double-spend is prevented
 * 3. Idempotency keys prevent duplicate transactions
 * 4. Reconciliation detects discrepancies
 *
 * These tests use mocked DB operations to test the logic without hitting a real DB.
 * For integration tests that hit the real DB, see tests/integration/wallet.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      wallets: { findFirst: vi.fn() },
      walletTransactions: { findFirst: vi.fn(), findMany: vi.fn() },
      spendHolds: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'test-id' }])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    transaction: vi.fn(),
    execute: vi.fn(),
  },
  wallets: { userId: 'user_id', balance: 'balance', heldBalance: 'held_balance' },
  walletTransactions: { idempotencyKey: 'idempotency_key' },
  spendHolds: { id: 'id' },
  users: { id: 'id' },
}));

// Mock cache
vi.mock('@/lib/cache', () => ({
  getCachedBalance: vi.fn(),
  setCachedBalance: vi.fn(),
  invalidateBalanceCache: vi.fn(),
  withMiniLock: vi.fn((key, fn) => fn()),
}));

// Mock tiers
vi.mock('@/lib/tiers/spend-tiers', () => ({
  calculateTier: vi.fn(() => 'none'),
}));

// Mock audit service
vi.mock('@/lib/services/financial-audit-service', () => ({
  FinancialAuditService: {
    log: vi.fn(() => Promise.resolve()),
  },
}));

import { db } from '@/lib/data/system';

describe('Wallet Invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Balance Never Goes Negative', () => {
    it('rejects transaction when amount exceeds available balance', async () => {
      // Setup: user has 100 coins, 20 held
      const mockWallet = {
        id: 'wallet-1',
        user_id: 'user-1',
        balance: 100,
        held_balance: 20,
      };

      // Mock transaction to capture the logic
      let capturedError: Error | null = null;
      (db.transaction as any).mockImplementation(async (fn: Function) => {
        // Simulate the transaction context
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1' }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 0 })) },
          },
        };

        try {
          return await fn(tx);
        } catch (err) {
          capturedError = err as Error;
          throw err;
        }
      });

      // Import WalletService after mocks are set up
      const { WalletService } = await import('@/lib/wallet/wallet-service');

      // Act: Try to spend 100 coins when only 80 are available (100 - 20 held)
      await expect(
        WalletService.createTransaction({
          userId: 'user-1',
          amount: -100, // Try to spend 100
          type: 'call_charge',
          description: 'Test',
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('allows transaction when amount is within available balance', async () => {
      const mockWallet = {
        id: 'wallet-1',
        user_id: 'user-1',
        balance: 100,
        held_balance: 20,
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', amount: -50 }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 50 })) },
          },
        };

        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      // Act: Spend 50 coins (within available balance of 80)
      const result = await WalletService.createTransaction({
        userId: 'user-1',
        amount: -50,
        type: 'call_charge',
        description: 'Test',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('tx-1');
    });
  });

  describe('Idempotency', () => {
    it('returns existing transaction when idempotency key already exists', async () => {
      const existingTransaction = {
        id: 'existing-tx',
        userId: 'user-1',
        amount: 100,
        type: 'purchase',
        status: 'completed',
        idempotencyKey: 'stripe_session_123',
      };

      // Mock finding existing transaction
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(existingTransaction);

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      // Act: Try to create transaction with same idempotency key
      const result = await WalletService.createTransaction({
        userId: 'user-1',
        amount: 100,
        type: 'purchase',
        description: 'Test',
        idempotencyKey: 'stripe_session_123',
      });

      // Assert: Should return existing transaction, not create new one
      expect(result).toEqual(existingTransaction);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('creates new transaction when idempotency key is unique', async () => {
      // Mock: no existing transaction
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = {
        id: 'wallet-1',
        user_id: 'user-1',
        balance: 0,
        held_balance: 0,
      };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'new-tx', amount: 100 }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve(null)) },
          },
        };

        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      const result = await WalletService.createTransaction({
        userId: 'user-1',
        amount: 100,
        type: 'purchase',
        description: 'Test',
        idempotencyKey: 'new_unique_key',
      });

      expect(result.id).toBe('new-tx');
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('Hold Settlement', () => {
    it('caps settlement amount to wallet balance to prevent negative balance', async () => {
      // Scenario: Hold was for 100 coins, but wallet only has 50
      // This can happen if wallet was drained by another transaction
      const mockHold = {
        id: 'hold-1',
        userId: 'user-1',
        amount: 100,
        purpose: 'call_hold',
        status: 'active',
      };

      const mockWallet = {
        id: 'wallet-1',
        user_id: 'user-1',
        balance: 50, // Less than hold amount
        held_balance: 100,
      };

      // Mock: no existing settled transaction
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedTransactionAmount: number | null = null;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: {
              findFirst: vi.fn(() => Promise.resolve(mockHold)),
            },
            users: {
              findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 50 })),
            },
          },
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((values: any) => {
              capturedTransactionAmount = values.amount;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'settle-tx', amount: values.amount }])),
              };
            }),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
        };

        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      // Act: Settle hold for full amount (100)
      await WalletService.settleHold('hold-1', 100);

      // Assert: Amount should be capped to 50 (wallet balance)
      expect(capturedTransactionAmount).toBe(-50);
    });
  });

  describe('Reconciliation', () => {
    it('detects discrepancy when balance does not match transaction sum', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: 150, // Stored balance
        heldBalance: 0,
      };

      const mockTransactions = [
        { amount: 100, status: 'completed' },
        { amount: 50, status: 'completed' },
        { amount: -20, status: 'completed' },
        // Sum = 130, but wallet shows 150 (discrepancy of 20)
      ];

      (db.query.wallets.findFirst as any).mockResolvedValue(mockWallet);
      (db.query.walletTransactions.findMany as any).mockResolvedValue(mockTransactions);

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      const result = await WalletService.reconcileWallet('user-1');

      expect(result.status).toBe('discrepancy');
      expect(result.amount).toBe(20); // 150 - 130
    });

    it('returns ok when balance matches transaction sum', async () => {
      const mockWallet = {
        id: 'wallet-1',
        userId: 'user-1',
        balance: 130,
        heldBalance: 0,
      };

      const mockTransactions = [
        { amount: 100, status: 'completed' },
        { amount: 50, status: 'completed' },
        { amount: -20, status: 'completed' },
        // Sum = 130, matches wallet
      ];

      (db.query.wallets.findFirst as any).mockResolvedValue(mockWallet);
      (db.query.walletTransactions.findMany as any).mockResolvedValue(mockTransactions);
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      const result = await WalletService.reconcileWallet('user-1');

      expect(result.status).toBe('ok');
      expect(result.balance).toBe(130);
    });
  });
});

describe('Available Balance Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subtracts held balance from total balance', async () => {
    const mockWallet = {
      id: 'wallet-1',
      userId: 'user-1',
      balance: 100,
      heldBalance: 30,
    };

    (db.query.wallets.findFirst as any).mockResolvedValue(mockWallet);

    const { WalletService } = await import('@/lib/wallet/wallet-service');

    const available = await WalletService.getAvailableBalance('user-1');

    expect(available).toBe(70); // 100 - 30
  });

  it('returns 0 for new users without wallet', async () => {
    (db.query.wallets.findFirst as any).mockResolvedValue(null);
    (db.insert as any).mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'new-wallet', balance: 0, heldBalance: 0 }])),
      })),
    });

    const { WalletService } = await import('@/lib/wallet/wallet-service');

    const available = await WalletService.getAvailableBalance('new-user');

    expect(available).toBe(0);
  });
});
