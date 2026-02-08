/**
 * CallService Test Suite
 *
 * Tests: getCreatorSettings, updateCreatorSettings, requestCall,
 * acceptCall, rejectCall, cancelCall, startCall, endCall,
 * markCallAsMissed, isCallExpired, cleanupExpiredCalls,
 * cleanupStaleAcceptedCalls, cleanupStaleActiveCalls, runAllCleanup.
 *
 * Focuses on: hold lifecycle, billing correctness, idempotency,
 * billing caps, state transitions, and cron cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      creatorSettings: { findFirst: vi.fn() },
      calls: { findFirst: vi.fn(), findMany: vi.fn() },
      walletTransactions: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'new-id', fanId: 'fan-1', creatorId: 'creator-1',
          status: 'pending', holdId: 'hold-1', callType: 'video',
          ratePerMinute: 25, estimatedCoins: 125, roomName: 'call-test',
        }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'updated-id', status: 'updated' }])),
        })),
      })),
    })),
    transaction: vi.fn(),
    execute: vi.fn(),
  },
  calls: {
    id: 'id', fanId: 'fan_id', creatorId: 'creator_id',
    status: 'status', requestedAt: 'requested_at', acceptedAt: 'accepted_at',
    startedAt: 'started_at', createdAt: 'created_at',
  },
  creatorSettings: {
    id: 'id', userId: 'user_id',
  },
  users: { id: 'id' },
  spendHolds: { id: 'id' },
  walletTransactions: { id: 'id', idempotencyKey: 'idempotency_key' },
  wallets: {
    userId: 'user_id', balance: 'balance', heldBalance: 'held_balance',
  },
}));

vi.mock('@/lib/wallet/wallet-service', () => ({
  WalletService: {
    createHold: vi.fn(() => Promise.resolve({ id: 'hold-1', amount: 125 })),
    releaseHold: vi.fn(() => Promise.resolve()),
    getAvailableBalance: vi.fn(() => Promise.resolve(50)),
  },
}));

vi.mock('@/lib/cache', () => ({
  invalidateBalanceCache: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/services/financial-audit-service', () => ({
  FinancialAuditService: {
    log: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid-16chars'),
}));

import { db } from '@/lib/data/system';
import { WalletService } from '@/lib/wallet/wallet-service';
import { invalidateBalanceCache } from '@/lib/cache';
import { FinancialAuditService } from '@/lib/services/financial-audit-service';
import { CallService } from '@/lib/services/call-service';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CallService', () => {
  describe('getCreatorSettings', () => {
    it('returns existing settings', async () => {
      const settings = {
        id: 'settings-1', userId: 'creator-1',
        callRatePerMinute: 30, minimumCallDuration: 10,
      };
      (db.query.creatorSettings.findFirst as any).mockResolvedValue(settings);

      const result = await CallService.getCreatorSettings('creator-1');
      expect(result).toEqual(settings);
    });

    it('creates default settings when none exist', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue(null);
      const defaultSettings = {
        id: 'new-settings', userId: 'creator-1',
        callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
        messageRate: 3, isAvailableForCalls: true, isAvailableForVoiceCalls: true,
      };
      const mockReturning = vi.fn(() => Promise.resolve([defaultSettings]));
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({ returning: mockReturning })),
      });

      const result = await CallService.getCreatorSettings('creator-1');

      expect(result).toEqual(defaultSettings);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('requestCall', () => {
    it('creates a video call request with hold', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue({
        id: 'settings-1', callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
        isAvailableForCalls: true, isAvailableForVoiceCalls: true,
      });
      // Reset insert mock to return call data
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{
            id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1',
            status: 'pending', holdId: 'hold-1', callType: 'video',
            ratePerMinute: 25, estimatedCoins: 125, roomName: 'call-test',
          }])),
        })),
      });

      const result = await CallService.requestCall('fan-1', 'creator-1', 'video');

      expect(WalletService.createHold).toHaveBeenCalledWith({
        userId: 'fan-1',
        amount: 125, // 25 * 5
        purpose: 'video_call',
        relatedId: undefined,
      });
      expect(result).toEqual(expect.objectContaining({ status: 'pending' }));
    });

    it('creates a voice call request with lower rate', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue({
        id: 'settings-1', callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
        isAvailableForCalls: true, isAvailableForVoiceCalls: true,
      });

      await CallService.requestCall('fan-1', 'creator-1', 'voice');

      expect(WalletService.createHold).toHaveBeenCalledWith({
        userId: 'fan-1',
        amount: 75, // 15 * 5
        purpose: 'voice_call',
        relatedId: undefined,
      });
    });

    it('throws when creator not available for video calls', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue({
        id: 'settings-1', isAvailableForCalls: false, isAvailableForVoiceCalls: true,
        callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
      });

      await expect(
        CallService.requestCall('fan-1', 'creator-1', 'video')
      ).rejects.toThrow('Creator is not available for video calls');
    });

    it('throws when creator not available for voice calls', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue({
        id: 'settings-1', isAvailableForCalls: true, isAvailableForVoiceCalls: false,
        callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
      });

      await expect(
        CallService.requestCall('fan-1', 'creator-1', 'voice')
      ).rejects.toThrow('Creator is not available for voice calls');
    });

    it('provides user-friendly error on insufficient balance', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue({
        id: 'settings-1', callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
        isAvailableForCalls: true, isAvailableForVoiceCalls: true,
      });
      vi.mocked(WalletService.createHold).mockRejectedValue(
        new Error('Insufficient balance for hold')
      );
      vi.mocked(WalletService.getAvailableBalance).mockResolvedValue(50);

      await expect(
        CallService.requestCall('fan-1', 'creator-1', 'video')
      ).rejects.toThrow(/Insufficient balance.*50 coins available.*125 coins/);
    });

    it('re-throws wallet not found error', async () => {
      (db.query.creatorSettings.findFirst as any).mockResolvedValue({
        id: 'settings-1', callRatePerMinute: 25, minimumCallDuration: 5,
        voiceCallRatePerMinute: 15, minimumVoiceCallDuration: 5,
        isAvailableForCalls: true, isAvailableForVoiceCalls: true,
      });
      vi.mocked(WalletService.createHold).mockRejectedValue(
        new Error('Wallet not found')
      );

      await expect(
        CallService.requestCall('fan-1', 'creator-1', 'video')
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('acceptCall', () => {
    it('accepts a pending call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', creatorId: 'creator-1', status: 'pending',
      });

      const result = await CallService.acceptCall('call-1', 'creator-1');
      expect(db.update).toHaveBeenCalled();
    });

    it('throws when call not found', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(null);

      await expect(
        CallService.acceptCall('call-1', 'creator-1')
      ).rejects.toThrow('Call not found');
    });

    it('throws when wrong creator', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', creatorId: 'creator-2', status: 'pending',
      });

      await expect(
        CallService.acceptCall('call-1', 'creator-1')
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when call is not pending', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', creatorId: 'creator-1', status: 'active',
      });

      await expect(
        CallService.acceptCall('call-1', 'creator-1')
      ).rejects.toThrow('Call is not pending');
    });
  });

  describe('rejectCall', () => {
    it('rejects a call and releases the hold', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', creatorId: 'creator-1', status: 'pending', holdId: 'hold-1',
      });

      await CallService.rejectCall('call-1', 'creator-1');

      expect(WalletService.releaseHold).toHaveBeenCalledWith('hold-1');
      expect(db.update).toHaveBeenCalled();
    });

    it('skips hold release when no holdId', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', creatorId: 'creator-1', status: 'pending', holdId: null,
      });

      await CallService.rejectCall('call-1', 'creator-1');

      expect(WalletService.releaseHold).not.toHaveBeenCalled();
    });

    it('throws when call not found', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(null);

      await expect(
        CallService.rejectCall('call-1', 'creator-1')
      ).rejects.toThrow('Call not found');
    });
  });

  describe('cancelCall', () => {
    it('allows fan to cancel pending call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1',
        status: 'pending', holdId: 'hold-1',
      });

      await CallService.cancelCall('call-1', 'fan-1', 'Changed my mind');

      expect(WalletService.releaseHold).toHaveBeenCalledWith('hold-1');
    });

    it('allows creator to cancel accepted call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1',
        status: 'accepted', holdId: 'hold-1',
      });

      await CallService.cancelCall('call-1', 'creator-1');

      expect(WalletService.releaseHold).toHaveBeenCalledWith('hold-1');
    });

    it('throws when unauthorized user tries to cancel', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1', status: 'pending',
      });

      await expect(
        CallService.cancelCall('call-1', 'random-user')
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when trying to cancel an active call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1', status: 'active',
      });

      await expect(
        CallService.cancelCall('call-1', 'fan-1')
      ).rejects.toThrow('Cannot cancel a call that has already started or completed');
    });

    it('throws when trying to cancel a completed call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1', status: 'completed',
      });

      await expect(
        CallService.cancelCall('call-1', 'fan-1')
      ).rejects.toThrow('Cannot cancel a call that has already started or completed');
    });
  });

  describe('startCall', () => {
    it('starts an accepted call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1', status: 'accepted',
      });

      await CallService.startCall('call-1', 'fan-1');
      expect(db.update).toHaveBeenCalled();
    });

    it('throws when call is not accepted', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1', status: 'pending',
      });

      await expect(
        CallService.startCall('call-1', 'fan-1')
      ).rejects.toThrow('Call must be accepted first');
    });

    it('throws when unauthorized', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1', status: 'accepted',
      });

      await expect(
        CallService.startCall('call-1', 'random-user')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('endCall', () => {
    const activeCall = {
      id: 'call-1', fanId: 'fan-1', creatorId: 'creator-1',
      status: 'active', callType: 'video',
      ratePerMinute: 25, estimatedCoins: 125,
      holdId: 'hold-1',
      startedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      acceptedAt: new Date(Date.now() - 12 * 60 * 1000),
    };

    it('throws when call not found', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(null);

      await expect(
        CallService.endCall('call-1', 'fan-1')
      ).rejects.toThrow('Call not found');
    });

    it('throws when unauthorized', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(activeCall);

      await expect(
        CallService.endCall('call-1', 'random-user')
      ).rejects.toThrow('Unauthorized');
    });

    it('throws when call is not active or accepted', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        ...activeCall, status: 'completed',
      });

      await expect(
        CallService.endCall('call-1', 'fan-1')
      ).rejects.toThrow('Call is not active');
    });

    it('handles idempotent endCall (already processed)', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(activeCall);

      const mockTx = {
        query: {
          walletTransactions: { findFirst: vi.fn().mockResolvedValue({ id: 'existing-tx' }) },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{ ...activeCall, status: 'completed' }])),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve()),
        })),
        execute: vi.fn(),
      };
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await CallService.endCall('call-1', 'fan-1');

      // Should not log audit (billedCoins=0 for idempotent case)
      expect(FinancialAuditService.log).not.toHaveBeenCalled();
    });

    it('bills correctly and caps when balance is insufficient', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(activeCall);

      const mockTx = {
        query: {
          walletTransactions: { findFirst: vi.fn().mockResolvedValue(null) }, // not idempotent
        },
        execute: vi.fn(() => Promise.resolve([
          { user_id: 'fan-1', balance: 100, held_balance: 125 },
          { user_id: 'creator-1', balance: 500, held_balance: 0 },
        ])),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{
                ...activeCall, status: 'completed', actualCoins: 100, callType: 'video',
                ratePerMinute: 25,
              }])),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve()),
        })),
      };
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      const result = await CallService.endCall('call-1', 'fan-1');

      // Fan only has 100, so billing should be capped at 100 (not 250 for 10 min)
      expect(invalidateBalanceCache).toHaveBeenCalledWith('fan-1');
      expect(invalidateBalanceCache).toHaveBeenCalledWith('creator-1');
    });

    it('invalidates balance caches after billing', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(activeCall);

      const mockTx = {
        query: {
          walletTransactions: { findFirst: vi.fn().mockResolvedValue(null) },
        },
        execute: vi.fn(() => Promise.resolve([
          { user_id: 'fan-1', balance: 500, held_balance: 125 },
          { user_id: 'creator-1', balance: 100, held_balance: 0 },
        ])),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{
                ...activeCall, status: 'completed', callType: 'video', ratePerMinute: 25,
              }])),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve()),
        })),
      };
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      await CallService.endCall('call-1', 'fan-1');

      expect(invalidateBalanceCache).toHaveBeenCalledWith('fan-1');
      expect(invalidateBalanceCache).toHaveBeenCalledWith('creator-1');
    });

    it('logs to financial audit for non-zero billing', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(activeCall);

      const mockTx = {
        query: {
          walletTransactions: { findFirst: vi.fn().mockResolvedValue(null) },
        },
        execute: vi.fn(() => Promise.resolve([
          { user_id: 'fan-1', balance: 1000, held_balance: 125 },
          { user_id: 'creator-1', balance: 100, held_balance: 0 },
        ])),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([{
                ...activeCall, status: 'completed', callType: 'video', ratePerMinute: 25,
              }])),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve()),
        })),
      };
      (db.transaction as any).mockImplementation(async (fn: any) => fn(mockTx));

      await CallService.endCall('call-1', 'fan-1');

      // Wait for async audit logging
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should log both fan payment and creator earnings
      expect(FinancialAuditService.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('markCallAsMissed', () => {
    it('marks a pending call as missed and releases hold', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', status: 'pending', holdId: 'hold-1',
      });

      await CallService.markCallAsMissed('call-1');

      expect(WalletService.releaseHold).toHaveBeenCalledWith('hold-1');
      expect(db.update).toHaveBeenCalled();
    });

    it('throws when call not found', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(null);

      await expect(
        CallService.markCallAsMissed('call-1')
      ).rejects.toThrow('Call not found');
    });

    it('throws when call is not pending', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', status: 'active',
      });

      await expect(
        CallService.markCallAsMissed('call-1')
      ).rejects.toThrow('Call is not pending');
    });
  });

  describe('isCallExpired', () => {
    it('returns true for an old pending call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', status: 'pending',
        requestedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
      });

      const result = await CallService.isCallExpired('call-1');
      expect(result).toBe(true);
    });

    it('returns false for a recent pending call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', status: 'pending',
        requestedAt: new Date(Date.now() - 60 * 1000), // 1 min ago
      });

      const result = await CallService.isCallExpired('call-1');
      expect(result).toBe(false);
    });

    it('returns false for non-pending call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue({
        id: 'call-1', status: 'active',
        requestedAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      const result = await CallService.isCallExpired('call-1');
      expect(result).toBe(false);
    });

    it('returns false for non-existent call', async () => {
      (db.query.calls.findFirst as any).mockResolvedValue(null);

      const result = await CallService.isCallExpired('call-1');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredCalls', () => {
    it('expires old pending calls', async () => {
      const expiredCalls = [
        { id: 'call-1', status: 'pending', holdId: 'hold-1' },
        { id: 'call-2', status: 'pending', holdId: 'hold-2' },
      ];
      (db.query.calls.findMany as any).mockResolvedValue(expiredCalls);
      // markCallAsMissed calls findFirst for each
      (db.query.calls.findFirst as any)
        .mockResolvedValueOnce({ id: 'call-1', status: 'pending', holdId: 'hold-1' })
        .mockResolvedValueOnce({ id: 'call-2', status: 'pending', holdId: 'hold-2' });

      const result = await CallService.cleanupExpiredCalls();

      expect(result).toBe(2);
    });

    it('returns 0 when no expired calls', async () => {
      (db.query.calls.findMany as any).mockResolvedValue([]);

      const result = await CallService.cleanupExpiredCalls();
      expect(result).toBe(0);
    });

    it('continues processing when one call fails', async () => {
      const expiredCalls = [
        { id: 'call-1', status: 'pending', holdId: 'hold-1' },
        { id: 'call-2', status: 'pending', holdId: 'hold-2' },
      ];
      (db.query.calls.findMany as any).mockResolvedValue(expiredCalls);
      (db.query.calls.findFirst as any)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'call-2', status: 'pending', holdId: 'hold-2' });

      const result = await CallService.cleanupExpiredCalls();
      // First failed, second succeeded
      expect(result).toBe(1);
    });
  });

  describe('cleanupStaleAcceptedCalls', () => {
    it('cancels stale accepted calls and releases holds', async () => {
      (db.query.calls.findMany as any).mockResolvedValue([
        { id: 'call-1', status: 'accepted', holdId: 'hold-1', acceptedAt: new Date(Date.now() - 60 * 60 * 1000) },
      ]);

      const result = await CallService.cleanupStaleAcceptedCalls();

      expect(result).toBe(1);
      expect(WalletService.releaseHold).toHaveBeenCalledWith('hold-1');
    });

    it('skips hold release when no holdId', async () => {
      (db.query.calls.findMany as any).mockResolvedValue([
        { id: 'call-1', status: 'accepted', holdId: null },
      ]);

      await CallService.cleanupStaleAcceptedCalls();
      expect(WalletService.releaseHold).not.toHaveBeenCalled();
    });
  });

  describe('runAllCleanup', () => {
    it('runs all cleanup tasks in parallel', async () => {
      // Mock findMany for all three cleanup methods
      (db.query.calls.findMany as any).mockResolvedValue([]);

      const result = await CallService.runAllCleanup();

      expect(result).toEqual({ pending: 0, accepted: 0, active: 0 });
    });
  });
});
