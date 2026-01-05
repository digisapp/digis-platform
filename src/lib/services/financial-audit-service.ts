import { db } from '@/lib/data/system';
import { financialAuditLogs, FinancialEventType } from '@/db/schema/financial-audit';

// Re-export type for consumers
export type { FinancialEventType };
import { desc, eq, and, gte, lte, or } from 'drizzle-orm';
import { createHash } from 'crypto';

/**
 * Financial Audit Service
 *
 * Logs all financial operations for compliance, dispute resolution, and debugging.
 * This service should be called on EVERY financial operation.
 *
 * Design principles:
 * - Never throw errors (logging should not break transactions)
 * - Always capture balance snapshots
 * - Hash IPs for privacy
 * - Include request_id for distributed tracing
 */

export interface FinancialAuditParams {
  eventType: FinancialEventType;
  requestId?: string;

  // Actors
  actorId?: string;
  targetId?: string;
  adminId?: string;

  // Financial
  amount: number;
  currency?: string;

  // Balance snapshots
  actorBalanceBefore?: number;
  actorBalanceAfter?: number;
  targetBalanceBefore?: number;
  targetBalanceAfter?: number;

  // References
  transactionId?: string;
  relatedTransactionId?: string;
  idempotencyKey?: string;
  payoutRequestId?: string;

  // Status
  previousStatus?: string;
  newStatus?: string;

  // Request context
  ipAddress?: string;
  userAgent?: string;

  // Context
  description?: string;
  metadata?: Record<string, unknown>;
  failureReason?: string;
}

export class FinancialAuditService {
  /**
   * Hash IP address for privacy while enabling fraud detection
   */
  private static hashIp(ip: string | undefined): string | null {
    if (!ip) return null;
    return createHash('sha256').update(ip).digest('hex').substring(0, 16);
  }

  /**
   * Log a financial event
   */
  static async log(params: FinancialAuditParams): Promise<void> {
    try {
      await db.insert(financialAuditLogs).values({
        eventType: params.eventType,
        requestId: params.requestId || null,
        actorId: params.actorId || null,
        targetId: params.targetId || null,
        adminId: params.adminId || null,
        amount: params.amount,
        currency: params.currency || 'coins',
        actorBalanceBefore: params.actorBalanceBefore ?? null,
        actorBalanceAfter: params.actorBalanceAfter ?? null,
        targetBalanceBefore: params.targetBalanceBefore ?? null,
        targetBalanceAfter: params.targetBalanceAfter ?? null,
        transactionId: params.transactionId || null,
        relatedTransactionId: params.relatedTransactionId || null,
        idempotencyKey: params.idempotencyKey || null,
        payoutRequestId: params.payoutRequestId || null,
        previousStatus: params.previousStatus || null,
        newStatus: params.newStatus || null,
        ipHash: this.hashIp(params.ipAddress),
        userAgent: params.userAgent || null,
        description: params.description || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        failureReason: params.failureReason || null,
      });
    } catch (error) {
      // Log to console but NEVER throw - audit logging must not break transactions
      console.error('[FinancialAudit] Failed to log event:', error, {
        eventType: params.eventType,
        actorId: params.actorId,
        amount: params.amount,
      });
    }
  }

  // ==================== Convenience Methods ====================

  /**
   * Log a tip sent (from viewer to creator)
   */
  static async logTip(params: {
    requestId?: string;
    senderId: string;
    creatorId: string;
    amount: number;
    senderBalanceBefore: number;
    senderBalanceAfter: number;
    creatorBalanceBefore: number;
    creatorBalanceAfter: number;
    transactionId?: string;
    relatedTransactionId?: string;
    idempotencyKey?: string;
    ipAddress?: string;
    userAgent?: string;
    context?: string; // 'stream', 'dm', 'profile'
  }): Promise<void> {
    // Log sender's debit
    await this.log({
      eventType: 'tip_sent',
      requestId: params.requestId,
      actorId: params.senderId,
      targetId: params.creatorId,
      amount: params.amount,
      actorBalanceBefore: params.senderBalanceBefore,
      actorBalanceAfter: params.senderBalanceAfter,
      transactionId: params.transactionId,
      idempotencyKey: params.idempotencyKey,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `Tip sent${params.context ? ` via ${params.context}` : ''}`,
      metadata: { context: params.context },
    });

    // Log creator's credit
    await this.log({
      eventType: 'tip_received',
      requestId: params.requestId,
      actorId: params.senderId,
      targetId: params.creatorId,
      amount: params.amount,
      targetBalanceBefore: params.creatorBalanceBefore,
      targetBalanceAfter: params.creatorBalanceAfter,
      transactionId: params.relatedTransactionId,
      relatedTransactionId: params.transactionId,
      idempotencyKey: params.idempotencyKey,
      description: `Tip received${params.context ? ` via ${params.context}` : ''}`,
      metadata: { context: params.context },
    });
  }

  /**
   * Log a gift sent (from viewer to creator during stream)
   */
  static async logGift(params: {
    requestId?: string;
    senderId: string;
    creatorId: string;
    amount: number;
    giftId: string;
    giftName: string;
    senderBalanceBefore: number;
    senderBalanceAfter: number;
    creatorBalanceBefore: number;
    creatorBalanceAfter: number;
    transactionId?: string;
    relatedTransactionId?: string;
    idempotencyKey?: string;
    streamId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      eventType: 'gift_sent',
      requestId: params.requestId,
      actorId: params.senderId,
      targetId: params.creatorId,
      amount: params.amount,
      actorBalanceBefore: params.senderBalanceBefore,
      actorBalanceAfter: params.senderBalanceAfter,
      transactionId: params.transactionId,
      idempotencyKey: params.idempotencyKey,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `Gift: ${params.giftName}`,
      metadata: { giftId: params.giftId, giftName: params.giftName, streamId: params.streamId },
    });

    await this.log({
      eventType: 'gift_received',
      requestId: params.requestId,
      actorId: params.senderId,
      targetId: params.creatorId,
      amount: params.amount,
      targetBalanceBefore: params.creatorBalanceBefore,
      targetBalanceAfter: params.creatorBalanceAfter,
      transactionId: params.relatedTransactionId,
      relatedTransactionId: params.transactionId,
      description: `Gift received: ${params.giftName}`,
      metadata: { giftId: params.giftId, giftName: params.giftName, streamId: params.streamId },
    });
  }

  /**
   * Log payout status changes
   */
  static async logPayoutStatusChange(params: {
    requestId?: string;
    creatorId: string;
    amount: number;
    payoutRequestId: string;
    previousStatus: string;
    newStatus: string;
    adminId?: string;
    transactionId?: string;
    failureReason?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // Map status to event type
    let eventType: FinancialEventType;
    switch (params.newStatus) {
      case 'pending':
        eventType = 'payout_requested';
        break;
      case 'processing':
        eventType = 'payout_processing';
        break;
      case 'completed':
        eventType = 'payout_completed';
        break;
      case 'failed':
        eventType = 'payout_failed';
        break;
      case 'cancelled':
        eventType = 'payout_cancelled';
        break;
      default:
        eventType = 'payout_requested';
    }

    await this.log({
      eventType,
      requestId: params.requestId,
      actorId: params.creatorId,
      targetId: params.creatorId,
      adminId: params.adminId,
      amount: params.amount,
      payoutRequestId: params.payoutRequestId,
      transactionId: params.transactionId,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      actorBalanceBefore: params.balanceBefore,
      actorBalanceAfter: params.balanceAfter,
      failureReason: params.failureReason,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      description: `Payout ${params.newStatus}`,
    });
  }

  /**
   * Log admin payout approval/rejection
   */
  static async logAdminPayoutAction(params: {
    requestId?: string;
    adminId: string;
    creatorId: string;
    amount: number;
    payoutRequestId: string;
    action: 'approved' | 'rejected';
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      eventType: params.action === 'approved' ? 'admin_payout_approved' : 'admin_payout_rejected',
      requestId: params.requestId,
      actorId: params.creatorId,
      adminId: params.adminId,
      amount: params.amount,
      payoutRequestId: params.payoutRequestId,
      description: `Admin ${params.action} payout${params.reason ? `: ${params.reason}` : ''}`,
      failureReason: params.action === 'rejected' ? params.reason : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log coin purchase
   */
  static async logCoinPurchase(params: {
    requestId?: string;
    userId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    transactionId?: string;
    stripePaymentId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      eventType: 'coin_purchase',
      requestId: params.requestId,
      actorId: params.userId,
      amount: params.amount,
      actorBalanceBefore: params.balanceBefore,
      actorBalanceAfter: params.balanceAfter,
      transactionId: params.transactionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { stripePaymentId: params.stripePaymentId },
    });
  }

  /**
   * Log admin refund
   */
  static async logAdminRefund(params: {
    requestId?: string;
    adminId: string;
    userId: string;
    amount: number;
    reason: string;
    balanceBefore: number;
    balanceAfter: number;
    transactionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      eventType: 'admin_refund',
      requestId: params.requestId,
      actorId: params.userId,
      adminId: params.adminId,
      amount: params.amount,
      actorBalanceBefore: params.balanceBefore,
      actorBalanceAfter: params.balanceAfter,
      transactionId: params.transactionId,
      description: `Admin refund: ${params.reason}`,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log hold operations
   */
  static async logHold(params: {
    requestId?: string;
    userId: string;
    amount: number;
    action: 'created' | 'settled' | 'released';
    holdId: string;
    purpose: string;
    balanceBefore?: number;
    balanceAfter?: number;
    heldBalanceBefore?: number;
    heldBalanceAfter?: number;
  }): Promise<void> {
    let eventType: FinancialEventType;
    switch (params.action) {
      case 'created':
        eventType = 'hold_created';
        break;
      case 'settled':
        eventType = 'hold_settled';
        break;
      case 'released':
        eventType = 'hold_released';
        break;
    }

    await this.log({
      eventType,
      requestId: params.requestId,
      actorId: params.userId,
      amount: params.amount,
      actorBalanceBefore: params.balanceBefore,
      actorBalanceAfter: params.balanceAfter,
      description: `Hold ${params.action}: ${params.purpose}`,
      metadata: {
        holdId: params.holdId,
        purpose: params.purpose,
        heldBalanceBefore: params.heldBalanceBefore,
        heldBalanceAfter: params.heldBalanceAfter,
      },
    });
  }

  // ==================== Query Methods ====================

  /**
   * Get audit logs for a user (as actor or target)
   */
  static async getLogsForUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { limit = 50, offset = 0, startDate, endDate } = options;

    const conditions = [
      or(
        eq(financialAuditLogs.actorId, userId),
        eq(financialAuditLogs.targetId, userId)
      ),
    ];

    if (startDate) {
      conditions.push(gte(financialAuditLogs.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(financialAuditLogs.createdAt, endDate));
    }

    return db.query.financialAuditLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(financialAuditLogs.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * Get audit logs for a payout request
   */
  static async getLogsForPayout(payoutRequestId: string) {
    return db.query.financialAuditLogs.findMany({
      where: eq(financialAuditLogs.payoutRequestId, payoutRequestId),
      orderBy: [desc(financialAuditLogs.createdAt)],
    });
  }

  /**
   * Get audit logs for a transaction
   */
  static async getLogsForTransaction(transactionId: string) {
    return db.query.financialAuditLogs.findMany({
      where: or(
        eq(financialAuditLogs.transactionId, transactionId),
        eq(financialAuditLogs.relatedTransactionId, transactionId)
      ),
      orderBy: [desc(financialAuditLogs.createdAt)],
    });
  }

  /**
   * Get recent audit logs by event type
   */
  static async getLogsByEventType(
    eventType: FinancialEventType,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { limit = 50, offset = 0, startDate, endDate } = options;

    const conditions = [eq(financialAuditLogs.eventType, eventType)];

    if (startDate) {
      conditions.push(gte(financialAuditLogs.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(financialAuditLogs.createdAt, endDate));
    }

    return db.query.financialAuditLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(financialAuditLogs.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * Get logs by request ID (for distributed tracing)
   */
  static async getLogsByRequestId(requestId: string) {
    return db.query.financialAuditLogs.findMany({
      where: eq(financialAuditLogs.requestId, requestId),
      orderBy: [desc(financialAuditLogs.createdAt)],
    });
  }
}
