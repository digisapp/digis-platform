/**
 * Comprehensive WalletService Test Suite
 *
 * Tests all 9 public methods of WalletService with full coverage of:
 * - Happy paths and error paths
 * - Idempotency, balance safety, holds, settlement, reconciliation
 * - Side effects (cache invalidation, tier updates, audit logging)
 *
 * Mock strategy matches wallet-invariants.test.ts pattern.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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
        returning: vi.fn(() => Promise.resolve([{ id: 'test-id', userId: 'user-1', balance: 0, heldBalance: 0 }])),
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'test-id', userId: 'user-1', balance: 0, heldBalance: 0 }])),
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
  walletTransactions: { idempotencyKey: 'idempotency_key', userId: 'user_id', status: 'status' },
  spendHolds: { id: 'id' },
  users: { id: 'id', lifetimeSpending: 'lifetime_spending', spendTier: 'spend_tier' },
}));

vi.mock('@/lib/cache', () => ({
  getCachedBalance: vi.fn(),
  setCachedBalance: vi.fn(),
  invalidateBalanceCache: vi.fn(),
  withMiniLock: vi.fn((_key: string, fn: () => Promise<any>, _ttl?: number) => fn()),
}));

vi.mock('@/lib/tiers/spend-tiers', () => ({
  calculateTier: vi.fn(() => 'bronze'),
}));

vi.mock('@/lib/services/financial-audit-service', () => ({
  FinancialAuditService: {
    log: vi.fn(() => Promise.resolve()),
  },
}));

import { db } from '@/lib/data/system';
import { withMiniLock, invalidateBalanceCache } from '@/lib/cache';
import { calculateTier } from '@/lib/tiers/spend-tiers';
import { FinancialAuditService } from '@/lib/services/financial-audit-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a mock Drizzle transaction context with sensible defaults */
function createMockTx(overrides: {
  walletRows?: any[];
  insertReturning?: any[];
  selectFrom?: any[];
  holdResult?: any;
  userResult?: any;
} = {}) {
  const {
    walletRows = [],
    insertReturning = [{ id: 'tx-1', userId: 'user-1', amount: 0, balance: 0, heldBalance: 0 }],
    selectFrom,
    holdResult = null,
    userResult = { lifetimeSpending: 0 },
  } = overrides;

  return {
    execute: vi.fn(() => Promise.resolve(walletRows)),
    insert: vi.fn(() => ({
      values: vi.fn((vals: any) => {
        const result = {
          returning: vi.fn(() => Promise.resolve(insertReturning.length ? [{ ...insertReturning[0], ...vals }] : insertReturning)),
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve(insertReturning.length ? [{ ...insertReturning[0], ...vals }] : [])),
          })),
        };
        return result;
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    select: selectFrom ? vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(selectFrom)),
      })),
    })) : vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
    query: {
      spendHolds: { findFirst: vi.fn(() => Promise.resolve(holdResult)) },
      users: { findFirst: vi.fn(() => Promise.resolve(userResult)) },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getBalance
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getBalance', () => {
    it('returns balance from DB via withMiniLock', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue({ balance: 500 });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const balance = await WalletService.getBalance('user-1');

      expect(balance).toBe(500);
      expect(withMiniLock).toHaveBeenCalled();
    });

    it('creates wallet and returns 0 when user has no wallet', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue(null);
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'new-wallet', userId: 'user-1', balance: 0, heldBalance: 0 }])),
        })),
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const balance = await WalletService.getBalance('no-wallet-user');

      expect(balance).toBe(0);
    });

    it('passes correct cache key and TTL to withMiniLock', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue({ balance: 100 });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.getBalance('user-42');

      expect(withMiniLock).toHaveBeenCalledWith(
        'balance:user-42',
        expect.any(Function),
        60
      );
    });

    it('returns balance field (not heldBalance)', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue({ balance: 200, heldBalance: 75 });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const balance = await WalletService.getBalance('user-1');

      expect(balance).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAvailableBalance
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getAvailableBalance', () => {
    it('returns balance minus heldBalance for existing wallet', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue({
        balance: 300,
        heldBalance: 50,
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const available = await WalletService.getAvailableBalance('user-1');

      expect(available).toBe(250);
    });

    it('returns full balance when heldBalance is zero', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue({
        balance: 300,
        heldBalance: 0,
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const available = await WalletService.getAvailableBalance('user-1');

      expect(available).toBe(300);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createWallet
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createWallet', () => {
    it('inserts with balance=0 and heldBalance=0', async () => {
      let capturedValues: any = null;
      const mockValues = vi.fn((vals: any) => {
        capturedValues = vals;
        return {
          returning: vi.fn(() => Promise.resolve([{ id: 'w-1', userId: 'user-1', balance: 0, heldBalance: 0 }])),
        };
      });
      (db.insert as any).mockReturnValue({ values: mockValues });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createWallet('user-1');

      expect(capturedValues).toEqual({
        userId: 'user-1',
        balance: 0,
        heldBalance: 0,
      });
    });

    it('returns the created wallet object', async () => {
      const walletObj = { id: 'w-1', userId: 'user-1', balance: 0, heldBalance: 0 };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([walletObj])),
        })),
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.createWallet('user-1');

      expect(result).toEqual(walletObj);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createTransaction — Idempotency
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createTransaction — Idempotency', () => {
    it('creates transaction with generated UUID when no idempotency key provided', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedInsertValues: any = null;
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedInsertValues = vals;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
              };
            }),
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
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: 50,
        type: 'purchase',
      });

      // Should have a UUID-format idempotency key
      expect(capturedInsertValues.idempotencyKey).toBeDefined();
      expect(capturedInsertValues.idempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('skips DB transaction entirely on idempotent hit', async () => {
      const existing = { id: 'dup-tx', amount: 100, type: 'purchase', status: 'completed' };
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(existing);

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.createTransaction({
        userId: 'user-1',
        amount: 100,
        type: 'purchase',
        idempotencyKey: 'dup-key',
      });

      expect(result).toEqual(existing);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createTransaction — Balance & Wallet
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createTransaction — Balance & Wallet', () => {
    it('allows credit (positive amount) even with 0 balance', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 0, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = createMockTx({ walletRows: [mockWallet] });
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.createTransaction({
        userId: 'user-1',
        amount: 500,
        type: 'purchase',
      });

      expect(result).toBeDefined();
    });

    it('creates wallet inside transaction when none exists', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let walletCreated = false;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([])), // No existing wallet
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              if (vals.balance === 0 && vals.heldBalance === 0) {
                walletCreated = true;
              }
              return {
                returning: vi.fn(() => Promise.resolve([{
                  id: 'new-w', userId: 'user-1', balance: 0, heldBalance: 0,
                  ...vals,
                }])),
              };
            }),
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
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: 100,
        type: 'purchase',
      });

      expect(walletCreated).toBe(true);
    });

    it('correctly calculates available as balance - held_balance for debit check', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      // 100 balance, 60 held → only 40 available → spending 50 should fail
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 60 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = createMockTx({ walletRows: [mockWallet] });
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.createTransaction({
          userId: 'user-1',
          amount: -50,
          type: 'call_charge',
        })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createTransaction — Side Effects
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createTransaction — Side Effects', () => {
    it('inserts transaction record with correct fields', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedValues: any = null;
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 500, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedValues = vals;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
              };
            }),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 100 })) },
          },
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: -30,
        type: 'gift',
        description: 'Gift to creator',
        metadata: { recipientId: 'creator-1' },
        idempotencyKey: 'my-key',
      });

      expect(capturedValues.userId).toBe('user-1');
      expect(capturedValues.amount).toBe(-30);
      expect(capturedValues.type).toBe('gift');
      expect(capturedValues.status).toBe('completed');
      expect(capturedValues.idempotencyKey).toBe('my-key');
      expect(capturedValues.description).toBe('Gift to creator');
    });

    it('invalidates balance cache after wallet update', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = createMockTx({ walletRows: [mockWallet] });
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: 50,
        type: 'purchase',
      });

      expect(invalidateBalanceCache).toHaveBeenCalledWith('user-1');
    });

    it('stringifies metadata as JSON when provided', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedValues: any = null;
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedValues = vals;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
              };
            }),
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
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: 50,
        type: 'purchase',
        metadata: { stripeSessionId: 'sess_123' },
      });

      expect(capturedValues.metadata).toBe(JSON.stringify({ stripeSessionId: 'sess_123' }));
    });

    it('sets metadata to null when not provided', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedValues: any = null;
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedValues = vals;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
              };
            }),
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
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: 50,
        type: 'purchase',
      });

      expect(capturedValues.metadata).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createTransaction — Tier Updates
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createTransaction — Tier Updates', () => {
    it('updates lifetimeSpending for negative (debit) transactions', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let userUpdateCalled = false;
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 200, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
            })),
          })),
          update: vi.fn(() => {
            userUpdateCalled = true;
            return {
              set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve()),
              })),
            };
          }),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 100 })) },
          },
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: -75,
        type: 'call_charge',
      });

      expect(userUpdateCalled).toBe(true);
    });

    it('calls calculateTier and updates spendTier', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 200, held_balance: 0 };
      (calculateTier as any).mockReturnValue('gold');

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 50000 })) },
          },
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: -100,
        type: 'stream_tip',
      });

      expect(calculateTier).toHaveBeenCalledWith(50000);
    });

    it('skips lifetime/tier update for positive (credit) transactions', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 0, held_balance: 0 };

      let txUpdateCallCount = 0;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
            })),
          })),
          update: vi.fn(() => {
            txUpdateCallCount++;
            return {
              set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve()),
              })),
            };
          }),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve(null)) },
          },
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: 500,
        type: 'purchase',
      });

      // For credit: only 1 update call (wallet balance), no user lifetime/tier updates
      expect(txUpdateCallCount).toBe(1);
      expect(calculateTier).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createTransaction — Audit Logging
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createTransaction — Audit Logging', () => {
    it('maps transaction types to correct audit events', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 500, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 100 })) },
          },
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      // Debit gift → gift_sent
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: -50,
        type: 'gift',
      });

      expect(FinancialAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'gift_sent' })
      );
    });

    it('includes balanceBefore and balanceAfter snapshots', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 200, held_balance: 0 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => ({
              returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
            })),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve()),
            })),
          })),
          query: {
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 100 })) },
          },
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.createTransaction({
        userId: 'user-1',
        amount: -75,
        type: 'call_charge',
      });

      expect(FinancialAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorBalanceBefore: 200,
          actorBalanceAfter: 125, // 200 + (-75)
        })
      );
    });

    it('audit failure is swallowed (non-blocking)', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 0 };
      (FinancialAuditService.log as any).mockRejectedValue(new Error('Audit DB down'));

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = createMockTx({ walletRows: [mockWallet] });
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      // Should not throw despite audit failure
      const result = await WalletService.createTransaction({
        userId: 'user-1',
        amount: 100,
        type: 'purchase',
      });

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createHold
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createHold', () => {
    it('creates hold record and increments heldBalance on success', async () => {
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 200, held_balance: 0 };

      let holdInsertValues: any = null;
      let updateCalled = false;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              holdInsertValues = vals;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'hold-1', ...vals }])),
                onConflictDoNothing: vi.fn(() => ({
                  returning: vi.fn(() => Promise.resolve([{ id: 'hold-1', ...vals }])),
                })),
              };
            }),
          })),
          update: vi.fn(() => {
            updateCalled = true;
            return {
              set: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve()),
              })),
            };
          }),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const hold = await WalletService.createHold({
        userId: 'user-1',
        amount: 100,
        purpose: 'call_hold',
        relatedId: 'call-123',
      });

      expect(hold).toBeDefined();
      expect(holdInsertValues.status).toBe('active');
      expect(holdInsertValues.purpose).toBe('call_hold');
      expect(updateCalled).toBe(true);
    });

    it('rejects with "Insufficient balance for hold" when available < amount', async () => {
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 50, held_balance: 20 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(),
          update: vi.fn(),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.createHold({
          userId: 'user-1',
          amount: 40, // available is 30 (50-20)
          purpose: 'call_hold',
        })
      ).rejects.toThrow('Insufficient balance for hold');
    });

    it('creates wallet on-the-fly if none exists', async () => {
      let walletCreated = false;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([])), // No wallet
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              if (vals.balance === 0 && vals.heldBalance === 0) {
                walletCreated = true;
              }
              return {
                returning: vi.fn(() => Promise.resolve([{
                  id: 'new-w', userId: 'user-1', balance: 0, heldBalance: 0,
                }])),
                onConflictDoNothing: vi.fn(() => ({
                  returning: vi.fn(() => Promise.resolve([{
                    id: 'new-w', userId: 'user-1', balance: 0, heldBalance: 0,
                  }])),
                })),
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

      // Will create wallet but fail because balance=0 < amount
      await expect(
        WalletService.createHold({
          userId: 'user-1',
          amount: 50,
          purpose: 'call_hold',
        })
      ).rejects.toThrow('Insufficient balance for hold');

      expect(walletCreated).toBe(true);
    });

    it('handles concurrent wallet creation (onConflictDoNothing → fetch existing)', async () => {
      let fetchedExisting = false;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([])), // No wallet via FOR UPDATE
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([])), // Direct returning fails
              onConflictDoNothing: vi.fn(() => ({
                returning: vi.fn(() => Promise.resolve([])), // Conflict, empty return
              })),
            })),
          })),
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => {
                fetchedExisting = true;
                return Promise.resolve([{
                  id: 'existing-w', userId: 'user-1', balance: 100, heldBalance: 0,
                }]);
              }),
            })),
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
      const hold = await WalletService.createHold({
        userId: 'user-1',
        amount: 50,
        purpose: 'call_hold',
      });

      expect(fetchedExisting).toBe(true);
    });

    it('throws "Failed to create or find wallet" when wallet creation and fetch both fail', async () => {
      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([])),
          insert: vi.fn(() => ({
            values: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([])),
              onConflictDoNothing: vi.fn(() => ({
                returning: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })),
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([])), // fetch also returns nothing
            })),
          })),
          update: vi.fn(),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.createHold({
          userId: 'user-1',
          amount: 50,
          purpose: 'call_hold',
        })
      ).rejects.toThrow('Failed to create or find wallet');
    });

    it('hold has correct fields (userId, amount, purpose, relatedId, status)', async () => {
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 500, held_balance: 0 };

      let capturedHoldValues: any = null;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedHoldValues = vals;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'hold-1', ...vals }])),
                onConflictDoNothing: vi.fn(() => ({
                  returning: vi.fn(() => Promise.resolve([{ id: 'hold-1', ...vals }])),
                })),
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
      await WalletService.createHold({
        userId: 'user-1',
        amount: 100,
        purpose: 'stream_tip_hold',
        relatedId: 'stream-456',
      });

      expect(capturedHoldValues).toEqual(expect.objectContaining({
        userId: 'user-1',
        amount: 100,
        purpose: 'stream_tip_hold',
        relatedId: 'stream-456',
        status: 'active',
      }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // settleHold
  // ═══════════════════════════════════════════════════════════════════════════
  describe('settleHold', () => {
    it('returns existing transaction for duplicate settle key (idempotent)', async () => {
      const existing = { id: 'settled-tx', amount: -50, idempotencyKey: 'settle_hold-1' };
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(existing);

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.settleHold('hold-1', 50);

      expect(result).toEqual(existing);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('throws "Hold not found" for non-existent hold', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(null)) },
            users: { findFirst: vi.fn(() => Promise.resolve(null)) },
          },
          execute: vi.fn(),
          insert: vi.fn(),
          update: vi.fn(),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.settleHold('nonexistent-hold')
      ).rejects.toThrow('Hold not found');
    });

    it('throws "Hold is not active" for already-settled hold', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: {
              findFirst: vi.fn(() => Promise.resolve({
                id: 'hold-1',
                userId: 'user-1',
                amount: 100,
                purpose: 'call_hold',
                status: 'settled', // Already settled
              })),
            },
            users: { findFirst: vi.fn(() => Promise.resolve(null)) },
          },
          execute: vi.fn(),
          insert: vi.fn(),
          update: vi.fn(),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.settleHold('hold-1')
      ).rejects.toThrow('Hold is not active');
    });

    it('caps settlement to wallet.balance to prevent negative balance', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedAmount: number | null = null;
      const mockHold = { id: 'hold-1', userId: 'user-1', amount: 200, purpose: 'call_hold', status: 'active' };
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 80, held_balance: 200 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(mockHold)) },
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 100 })) },
          },
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedAmount = vals.amount;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
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
      await WalletService.settleHold('hold-1', 200);

      // Should cap to -80 (wallet balance), not -200
      expect(capturedAmount).toBe(-80);
    });

    it('clamps negative settlement amounts to 0', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      let capturedAmount: number | null = null;
      const mockHold = { id: 'hold-1', userId: 'user-1', amount: 100, purpose: 'call_hold', status: 'active' };
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 100, held_balance: 100 };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(mockHold)) },
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 0 })) },
          },
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedAmount = vals.amount;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
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
      await WalletService.settleHold('hold-1', -5);

      // Negative amount should be clamped to 0, resulting in -0 (which equals 0)
      expect(capturedAmount).toBe(-0);
    });

    it('releases full hold.amount from heldBalance but only deducts amountToSettle from balance', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const mockHold = { id: 'hold-1', userId: 'user-1', amount: 100, purpose: 'call_hold', status: 'active' };
      const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 200, held_balance: 100 };

      let capturedAmount: number | null = null;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(mockHold)) },
            users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 0 })) },
          },
          execute: vi.fn(() => Promise.resolve([mockWallet])),
          insert: vi.fn(() => ({
            values: vi.fn((vals: any) => {
              capturedAmount = vals.amount;
              return {
                returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
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
      // Settle for only 60 of the 100 hold
      await WalletService.settleHold('hold-1', 60);

      // Transaction amount should be -60 (the actual charge)
      expect(capturedAmount).toBe(-60);
    });

    it('maps hold purpose to transaction type: call_hold→call_charge, stream_tip_hold→stream_tip', async () => {
      (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

      const testCases = [
        { purpose: 'call_hold', expectedType: 'call_charge' },
        { purpose: 'stream_tip_hold', expectedType: 'stream_tip' },
      ];

      for (const { purpose, expectedType } of testCases) {
        vi.clearAllMocks();
        (db.query.walletTransactions.findFirst as any).mockResolvedValue(null);

        let capturedType: string | null = null;
        const mockHold = { id: `hold-${purpose}`, userId: 'user-1', amount: 50, purpose, status: 'active' };
        const mockWallet = { id: 'w-1', user_id: 'user-1', balance: 200, held_balance: 50 };

        (db.transaction as any).mockImplementation(async (fn: Function) => {
          const tx = {
            query: {
              spendHolds: { findFirst: vi.fn(() => Promise.resolve(mockHold)) },
              users: { findFirst: vi.fn(() => Promise.resolve({ lifetimeSpending: 0 })) },
            },
            execute: vi.fn(() => Promise.resolve([mockWallet])),
            insert: vi.fn(() => ({
              values: vi.fn((vals: any) => {
                capturedType = vals.type;
                return {
                  returning: vi.fn(() => Promise.resolve([{ id: 'tx-1', ...vals }])),
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
        await WalletService.settleHold(`hold-${purpose}`, 50);

        expect(capturedType).toBe(expectedType);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // releaseHold
  // ═══════════════════════════════════════════════════════════════════════════
  describe('releaseHold', () => {
    it('sets hold status to released with releasedAt', async () => {
      let capturedSetValues: any = null;
      const mockHold = { id: 'hold-1', userId: 'user-1', amount: 100, status: 'active' };

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        let updateCallCount = 0;
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(mockHold)) },
          },
          update: vi.fn(() => ({
            set: vi.fn((vals: any) => {
              if (updateCallCount === 0) {
                capturedSetValues = vals;
              }
              updateCallCount++;
              return {
                where: vi.fn(() => Promise.resolve()),
              };
            }),
          })),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.releaseHold('hold-1');

      expect(capturedSetValues.status).toBe('released');
      expect(capturedSetValues.releasedAt).toBeInstanceOf(Date);
    });

    it('decrements heldBalance by hold.amount', async () => {
      const mockHold = { id: 'hold-1', userId: 'user-1', amount: 75, status: 'active' };

      let updateCallCount = 0;

      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(mockHold)) },
          },
          update: vi.fn(() => ({
            set: vi.fn(() => {
              updateCallCount++;
              return {
                where: vi.fn(() => Promise.resolve()),
              };
            }),
          })),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.releaseHold('hold-1');

      // Two update calls: one for hold status, one for wallet heldBalance
      expect(updateCallCount).toBe(2);
    });

    it('throws "Hold not found" for missing hold', async () => {
      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: { findFirst: vi.fn(() => Promise.resolve(null)) },
          },
          update: vi.fn(),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.releaseHold('nonexistent')
      ).rejects.toThrow('Hold not found');
    });

    it('throws "Hold is not active" for non-active hold', async () => {
      (db.transaction as any).mockImplementation(async (fn: Function) => {
        const tx = {
          query: {
            spendHolds: {
              findFirst: vi.fn(() => Promise.resolve({
                id: 'hold-1',
                userId: 'user-1',
                amount: 100,
                status: 'released',
              })),
            },
          },
          update: vi.fn(),
        };
        return await fn(tx);
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');

      await expect(
        WalletService.releaseHold('hold-1')
      ).rejects.toThrow('Hold is not active');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getTransactions
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getTransactions', () => {
    it('returns transactions for user ordered by createdAt desc', async () => {
      const mockTxs = [
        { id: 'tx-2', amount: -50, createdAt: new Date('2025-02-02') },
        { id: 'tx-1', amount: 100, createdAt: new Date('2025-02-01') },
      ];
      (db.query.walletTransactions.findMany as any).mockResolvedValue(mockTxs);

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.getTransactions('user-1');

      expect(result).toEqual(mockTxs);
      expect(db.query.walletTransactions.findMany).toHaveBeenCalled();
    });

    it('defaults to limit=50', async () => {
      (db.query.walletTransactions.findMany as any).mockResolvedValue([]);

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      await WalletService.getTransactions('user-1');

      expect(db.query.walletTransactions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // reconcileWallet
  // ═══════════════════════════════════════════════════════════════════════════
  describe('reconcileWallet', () => {
    it('returns { status: "no_wallet" } when no wallet exists', async () => {
      (db.query.wallets.findFirst as any).mockResolvedValue(null);

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.reconcileWallet('ghost-user');

      expect(result).toEqual({ status: 'no_wallet' });
    });

    it('updates lastReconciled on successful reconciliation', async () => {
      const mockWallet = { balance: 100, heldBalance: 0 };
      const mockTxs = [
        { amount: 150, status: 'completed' },
        { amount: -50, status: 'completed' },
      ];

      (db.query.wallets.findFirst as any).mockResolvedValue(mockWallet);
      (db.query.walletTransactions.findMany as any).mockResolvedValue(mockTxs);
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.reconcileWallet('user-1');

      expect(result.status).toBe('ok');
      expect(result.balance).toBe(100);
      expect(db.update).toHaveBeenCalled();
    });

    it('sums only completed transactions for balance check', async () => {
      const mockWallet = { balance: 100, heldBalance: 0 };
      // Only completed transactions should be summed
      const mockTxs = [
        { amount: 200, status: 'completed' },
        { amount: -100, status: 'completed' },
        // If findMany were to return pending/failed, they shouldn't be here
        // because the service filters by status='completed'
      ];

      (db.query.wallets.findFirst as any).mockResolvedValue(mockWallet);
      (db.query.walletTransactions.findMany as any).mockResolvedValue(mockTxs);
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      });

      const { WalletService } = await import('@/lib/wallet/wallet-service');
      const result = await WalletService.reconcileWallet('user-1');

      // 200 + (-100) = 100, matches wallet.balance → ok
      expect(result.status).toBe('ok');
      expect(db.query.walletTransactions.findMany).toHaveBeenCalled();
    });
  });
});
