import { pgTable, uuid, text, timestamp, integer, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Financial Audit Log Schema
 *
 * Comprehensive audit trail for all financial operations.
 * Critical for compliance, dispute resolution, and debugging.
 *
 * Key design decisions:
 * - Separate from admin logs (different structure/queries)
 * - Stores balance snapshots for dispute resolution
 * - IP hashed for privacy while enabling fraud detection
 * - Immutable: only inserts, never updates
 */

export const financialEventTypeEnum = pgEnum('financial_event_type', [
  // User-initiated
  'coin_purchase',
  'tip_sent',
  'tip_received',
  'gift_sent',
  'gift_received',
  'message_unlock',
  'message_payment_received',
  'subscription_payment',
  'subscription_earned',
  'call_payment',
  'call_earned',
  'stream_ticket_purchase',
  'stream_ticket_earned',
  'ai_session_payment',
  'ai_session_earned',
  // Creator payouts
  'payout_requested',
  'payout_processing',
  'payout_completed',
  'payout_failed',
  'payout_cancelled',
  // Admin actions
  'admin_refund',
  'admin_adjustment',
  'admin_payout_approved',
  'admin_payout_rejected',
  // System events
  'hold_created',
  'hold_settled',
  'hold_released',
  'balance_reconciled'
]);

export const financialAuditLogs = pgTable('financial_audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Event identification
  eventType: financialEventTypeEnum('event_type').notNull(),
  requestId: text('request_id'), // For tracing across services

  // Actors
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }), // Who initiated
  targetId: uuid('target_id').references(() => users.id, { onDelete: 'set null' }), // Who was affected (creator for tips, etc.)
  adminId: uuid('admin_id').references(() => users.id, { onDelete: 'set null' }), // If admin action

  // Financial details
  amount: integer('amount').notNull(), // Amount in coins
  currency: text('currency').default('coins').notNull(),

  // Balance snapshots (critical for disputes)
  actorBalanceBefore: integer('actor_balance_before'),
  actorBalanceAfter: integer('actor_balance_after'),
  targetBalanceBefore: integer('target_balance_before'),
  targetBalanceAfter: integer('target_balance_after'),

  // Transaction references
  transactionId: uuid('transaction_id'), // wallet_transactions.id
  relatedTransactionId: uuid('related_transaction_id'), // For double-entry pair
  idempotencyKey: text('idempotency_key'),
  payoutRequestId: uuid('payout_request_id'), // For payout events

  // Status tracking (for events that have status)
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),

  // Request metadata (for fraud detection)
  ipHash: text('ip_hash'), // SHA256 hash of IP for privacy
  userAgent: text('user_agent'),

  // Context
  description: text('description'),
  metadata: text('metadata'), // JSON for additional context
  failureReason: text('failure_reason'), // For failed events

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Primary lookup patterns
  actorIdIdx: index('financial_audit_actor_id_idx').on(table.actorId),
  targetIdIdx: index('financial_audit_target_id_idx').on(table.targetId),
  eventTypeIdx: index('financial_audit_event_type_idx').on(table.eventType),
  transactionIdIdx: index('financial_audit_transaction_id_idx').on(table.transactionId),
  payoutRequestIdIdx: index('financial_audit_payout_request_id_idx').on(table.payoutRequestId),
  requestIdIdx: index('financial_audit_request_id_idx').on(table.requestId),

  // Time-based queries
  createdAtIdx: index('financial_audit_created_at_idx').on(table.createdAt),

  // Compound indexes for common queries
  actorTimeIdx: index('financial_audit_actor_time_idx').on(table.actorId, table.createdAt),
  targetTimeIdx: index('financial_audit_target_time_idx').on(table.targetId, table.createdAt),
  eventTimeIdx: index('financial_audit_event_time_idx').on(table.eventType, table.createdAt),
}));

// Relations for query API
export const financialAuditLogsRelations = relations(financialAuditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [financialAuditLogs.actorId],
    references: [users.id],
    relationName: 'financialAuditActor',
  }),
  target: one(users, {
    fields: [financialAuditLogs.targetId],
    references: [users.id],
    relationName: 'financialAuditTarget',
  }),
  admin: one(users, {
    fields: [financialAuditLogs.adminId],
    references: [users.id],
    relationName: 'financialAuditAdmin',
  }),
}));

export type FinancialAuditLog = typeof financialAuditLogs.$inferSelect;
export type NewFinancialAuditLog = typeof financialAuditLogs.$inferInsert;
export type FinancialEventType = typeof financialEventTypeEnum.enumValues[number];
