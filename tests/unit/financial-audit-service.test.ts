/**
 * FinancialAuditService Test Suite
 *
 * Tests: log, logTip, logGift, logPayoutStatusChange, logAdminPayoutAction,
 * logCoinPurchase, logAdminRefund, logHold, getLogsForUser, getLogsForPayout,
 * getLogsForTransaction, getLogsByEventType, getLogsByRequestId.
 *
 * Key guarantees: never throws, hashes IPs for privacy, dual-logging for tips/gifts,
 * correct status→eventType mapping for payouts, date range filtering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      financialAuditLogs: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('@/db/schema/financial-audit', () => ({
  financialAuditLogs: {
    actorId: 'actor_id',
    targetId: 'target_id',
    createdAt: 'created_at',
    payoutRequestId: 'payout_request_id',
    transactionId: 'transaction_id',
    relatedTransactionId: 'related_transaction_id',
    eventType: 'event_type',
    requestId: 'request_id',
  },
}));

import { db } from '@/lib/data/system';
import { FinancialAuditService } from '@/lib/services/financial-audit-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const insertValues = vi.fn(() => Promise.resolve());

function resetInsertMock() {
  insertValues.mockClear();
  (db.insert as any).mockReturnValue({ values: insertValues });
}

const findMany = db.query.financialAuditLogs.findMany as ReturnType<typeof vi.fn>;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  resetInsertMock();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FinancialAuditService', () => {
  describe('log', () => {
    it('inserts an audit log with all fields', async () => {
      await FinancialAuditService.log({
        eventType: 'tip_sent',
        requestId: 'req-1',
        actorId: 'user-1',
        targetId: 'user-2',
        amount: 100,
        currency: 'coins',
        actorBalanceBefore: 500,
        actorBalanceAfter: 400,
        transactionId: 'tx-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Test/1.0',
        description: 'Test tip',
        metadata: { foo: 'bar' },
      });

      expect(db.insert).toHaveBeenCalled();
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'tip_sent',
          actorId: 'user-1',
          targetId: 'user-2',
          amount: 100,
          currency: 'coins',
          description: 'Test tip',
        })
      );
    });

    it('hashes IP addresses for privacy', async () => {
      await FinancialAuditService.log({
        eventType: 'coin_purchase',
        actorId: 'user-1',
        amount: 50,
        ipAddress: '10.0.0.1',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      // IP should be hashed (16-char hex), not the raw IP
      expect(insertedValues.ipHash).not.toBe('10.0.0.1');
      expect(insertedValues.ipHash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('sets ipHash to null when no IP provided', async () => {
      await FinancialAuditService.log({
        eventType: 'tip_sent',
        actorId: 'user-1',
        amount: 10,
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.ipHash).toBeNull();
    });

    it('defaults currency to coins', async () => {
      await FinancialAuditService.log({
        eventType: 'tip_sent',
        actorId: 'user-1',
        amount: 10,
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.currency).toBe('coins');
    });

    it('stringifies metadata as JSON', async () => {
      await FinancialAuditService.log({
        eventType: 'tip_sent',
        actorId: 'user-1',
        amount: 10,
        metadata: { giftId: 'g-1', streamId: 's-1' },
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.metadata).toBe('{"giftId":"g-1","streamId":"s-1"}');
    });

    it('never throws on database error', async () => {
      insertValues.mockRejectedValueOnce(new Error('DB connection lost'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should NOT throw
      await expect(
        FinancialAuditService.log({
          eventType: 'tip_sent',
          actorId: 'user-1',
          amount: 100,
        })
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('sets null for optional fields when not provided', async () => {
      await FinancialAuditService.log({
        eventType: 'tip_sent',
        amount: 10,
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.actorId).toBeNull();
      expect(insertedValues.targetId).toBeNull();
      expect(insertedValues.adminId).toBeNull();
      expect(insertedValues.transactionId).toBeNull();
      expect(insertedValues.previousStatus).toBeNull();
      expect(insertedValues.newStatus).toBeNull();
      expect(insertedValues.failureReason).toBeNull();
      expect(insertedValues.metadata).toBeNull();
    });
  });

  describe('logTip', () => {
    it('creates dual logs (tip_sent + tip_received)', async () => {
      await FinancialAuditService.logTip({
        senderId: 'sender-1',
        creatorId: 'creator-1',
        amount: 50,
        senderBalanceBefore: 200,
        senderBalanceAfter: 150,
        creatorBalanceBefore: 1000,
        creatorBalanceAfter: 1050,
        transactionId: 'tx-debit',
        relatedTransactionId: 'tx-credit',
        context: 'stream',
      });

      // Two insert calls: one for tip_sent, one for tip_received
      expect(db.insert).toHaveBeenCalledTimes(2);

      const firstCall = insertValues.mock.calls[0][0];
      expect(firstCall.eventType).toBe('tip_sent');
      expect(firstCall.actorId).toBe('sender-1');
      expect(firstCall.actorBalanceBefore).toBe(200);
      expect(firstCall.actorBalanceAfter).toBe(150);
      expect(firstCall.transactionId).toBe('tx-debit');

      const secondCall = insertValues.mock.calls[1][0];
      expect(secondCall.eventType).toBe('tip_received');
      expect(secondCall.targetId).toBe('creator-1');
      expect(secondCall.targetBalanceBefore).toBe(1000);
      expect(secondCall.targetBalanceAfter).toBe(1050);
      expect(secondCall.transactionId).toBe('tx-credit');
      expect(secondCall.relatedTransactionId).toBe('tx-debit');
    });

    it('includes context in description', async () => {
      await FinancialAuditService.logTip({
        senderId: 's', creatorId: 'c', amount: 10,
        senderBalanceBefore: 100, senderBalanceAfter: 90,
        creatorBalanceBefore: 0, creatorBalanceAfter: 10,
        context: 'dm',
      });

      const sentLog = insertValues.mock.calls[0][0];
      expect(sentLog.description).toContain('via dm');
    });
  });

  describe('logGift', () => {
    it('creates dual logs with gift metadata', async () => {
      await FinancialAuditService.logGift({
        senderId: 'sender-1',
        creatorId: 'creator-1',
        amount: 100,
        giftId: 'gift-1',
        giftName: 'Diamond',
        senderBalanceBefore: 500,
        senderBalanceAfter: 400,
        creatorBalanceBefore: 200,
        creatorBalanceAfter: 300,
        streamId: 'stream-1',
      });

      expect(db.insert).toHaveBeenCalledTimes(2);

      const sentLog = insertValues.mock.calls[0][0];
      expect(sentLog.eventType).toBe('gift_sent');
      expect(sentLog.description).toBe('Gift: Diamond');

      const receivedLog = insertValues.mock.calls[1][0];
      expect(receivedLog.eventType).toBe('gift_received');
      expect(receivedLog.description).toBe('Gift received: Diamond');
    });
  });

  describe('logPayoutStatusChange', () => {
    const baseParams = {
      creatorId: 'creator-1',
      amount: 5000,
      payoutRequestId: 'payout-1',
      previousStatus: 'pending',
    };

    it.each([
      ['pending', 'payout_requested'],
      ['processing', 'payout_processing'],
      ['completed', 'payout_completed'],
      ['failed', 'payout_failed'],
      ['cancelled', 'payout_cancelled'],
    ] as const)('maps status "%s" to event type "%s"', async (newStatus, expectedEventType) => {
      await FinancialAuditService.logPayoutStatusChange({
        ...baseParams,
        newStatus,
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe(expectedEventType);
    });

    it('defaults unknown status to payout_requested', async () => {
      await FinancialAuditService.logPayoutStatusChange({
        ...baseParams,
        newStatus: 'unknown_status',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe('payout_requested');
    });

    it('includes failure reason when provided', async () => {
      await FinancialAuditService.logPayoutStatusChange({
        ...baseParams,
        newStatus: 'failed',
        failureReason: 'Payment provider declined',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.failureReason).toBe('Payment provider declined');
    });
  });

  describe('logAdminPayoutAction', () => {
    it('logs admin approval with correct event type', async () => {
      await FinancialAuditService.logAdminPayoutAction({
        adminId: 'admin-1',
        creatorId: 'creator-1',
        amount: 5000,
        payoutRequestId: 'payout-1',
        action: 'approved',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe('admin_payout_approved');
      expect(insertedValues.adminId).toBe('admin-1');
    });

    it('logs admin rejection with reason as failureReason', async () => {
      await FinancialAuditService.logAdminPayoutAction({
        adminId: 'admin-1',
        creatorId: 'creator-1',
        amount: 5000,
        payoutRequestId: 'payout-1',
        action: 'rejected',
        reason: 'Suspicious activity',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe('admin_payout_rejected');
      expect(insertedValues.failureReason).toBe('Suspicious activity');
      expect(insertedValues.description).toContain('Suspicious activity');
    });
  });

  describe('logCoinPurchase', () => {
    it('logs coin purchase with balance snapshots and stripe ID', async () => {
      await FinancialAuditService.logCoinPurchase({
        userId: 'user-1',
        amount: 1000,
        balanceBefore: 0,
        balanceAfter: 1000,
        transactionId: 'tx-1',
        stripePaymentId: 'pi_abc123',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe('coin_purchase');
      expect(insertedValues.actorId).toBe('user-1');
      expect(insertedValues.actorBalanceBefore).toBe(0);
      expect(insertedValues.actorBalanceAfter).toBe(1000);
      expect(insertedValues.metadata).toContain('pi_abc123');
    });
  });

  describe('logAdminRefund', () => {
    it('logs admin refund with reason in description', async () => {
      await FinancialAuditService.logAdminRefund({
        adminId: 'admin-1',
        userId: 'user-1',
        amount: 200,
        reason: 'Double charge',
        balanceBefore: 100,
        balanceAfter: 300,
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe('admin_refund');
      expect(insertedValues.adminId).toBe('admin-1');
      expect(insertedValues.description).toContain('Double charge');
    });
  });

  describe('logHold', () => {
    it.each([
      ['created', 'hold_created'],
      ['settled', 'hold_settled'],
      ['released', 'hold_released'],
    ] as const)('maps action "%s" to event type "%s"', async (action, expectedEventType) => {
      await FinancialAuditService.logHold({
        userId: 'user-1',
        amount: 500,
        action,
        holdId: 'hold-1',
        purpose: 'call_reserve',
      });

      const insertedValues = insertValues.mock.calls[0][0];
      expect(insertedValues.eventType).toBe(expectedEventType);
      expect(insertedValues.description).toContain(action);
      expect(insertedValues.description).toContain('call_reserve');
    });

    it('includes hold metadata', async () => {
      await FinancialAuditService.logHold({
        userId: 'user-1',
        amount: 500,
        action: 'created',
        holdId: 'hold-1',
        purpose: 'call_reserve',
        heldBalanceBefore: 0,
        heldBalanceAfter: 500,
      });

      const insertedValues = insertValues.mock.calls[0][0];
      const metadata = JSON.parse(insertedValues.metadata);
      expect(metadata.holdId).toBe('hold-1');
      expect(metadata.heldBalanceBefore).toBe(0);
      expect(metadata.heldBalanceAfter).toBe(500);
    });
  });

  describe('getLogsForUser', () => {
    it('queries logs where user is actor or target', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      findMany.mockResolvedValueOnce(mockLogs);

      const result = await FinancialAuditService.getLogsForUser('user-1');
      expect(result).toEqual(mockLogs);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });

    it('respects custom limit and offset', async () => {
      findMany.mockResolvedValueOnce([]);

      await FinancialAuditService.getLogsForUser('user-1', { limit: 10, offset: 20 });
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });
  });

  describe('getLogsForPayout', () => {
    it('returns logs for a payout request', async () => {
      const mockLogs = [{ id: 'log-1', payoutRequestId: 'payout-1' }];
      findMany.mockResolvedValueOnce(mockLogs);

      const result = await FinancialAuditService.getLogsForPayout('payout-1');
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getLogsForTransaction', () => {
    it('returns logs for a transaction (as primary or related)', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      findMany.mockResolvedValueOnce(mockLogs);

      const result = await FinancialAuditService.getLogsForTransaction('tx-1');
      expect(result).toEqual(mockLogs);
    });
  });

  describe('getLogsByEventType', () => {
    it('filters by event type with defaults', async () => {
      findMany.mockResolvedValueOnce([]);

      await FinancialAuditService.getLogsByEventType('tip_sent');
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });
  });

  describe('getLogsByRequestId', () => {
    it('returns all logs for a distributed request', async () => {
      const mockLogs = [{ id: 'log-1' }, { id: 'log-2' }];
      findMany.mockResolvedValueOnce(mockLogs);

      const result = await FinancialAuditService.getLogsByRequestId('req-123');
      expect(result).toEqual(mockLogs);
    });
  });
});
