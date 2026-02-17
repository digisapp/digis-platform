import { pgTable, uuid, integer, text, timestamp, pgEnum, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'purchase',
  'gift',
  'call_charge',
  'call_earnings',
  'message_charge',
  'message_earnings',
  'stream_tip',
  'stream_ticket',
  'ppv_unlock',
  'creator_payout',
  'payout_refund',
  'refund',
  'dm_tip',
  'locked_message',
  'subscription_payment',
  'subscription_earnings',
  'ai_session_charge',
  'ai_session_earnings',
  'ai_text_chat',
  'ai_text_earnings',
  'collection_purchase',
  'collection_earnings',
  'booking_payment',
  'booking_earnings',
  'booking_refund',
  'group_room_payment',
  'group_room_earnings'
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'completed',
  'failed',
  'refunded'
]);

export const holdStatusEnum = pgEnum('hold_status', ['active', 'settled', 'released']);

export const payoutStatusEnum = pgEnum('payout_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
]);

export const payoutMethodEnum = pgEnum('payout_method', [
  'bank_transfer',
  'payoneer'
]);

// Double-entry ledger table
export const walletTransactions = pgTable('wallet_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // Amount in coins (can be positive or negative)
  type: transactionTypeEnum('type').notNull(),
  status: transactionStatusEnum('status').default('pending').notNull(),
  description: text('description'),
  idempotencyKey: text('idempotency_key').unique(), // Prevents double-charges
  relatedTransactionId: uuid('related_transaction_id'), // Links to other half of double-entry
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wallet_transactions_user_id_idx').on(table.userId),
  // SECURITY: Unique index ensures idempotency under concurrent requests
  // The .unique() on the column creates a constraint; this adds an explicit unique index
  idempotencyIdx: uniqueIndex('wallet_transactions_idempotency_key_idx').on(table.idempotencyKey),
  // Compound index for efficient recent activity queries (userId + status, ordered by createdAt)
  userStatusIdx: index('wallet_transactions_user_status_idx').on(table.userId, table.status, table.createdAt),
}));

// Spend holds - prevents mid-call failures
export const spendHolds = pgTable('spend_holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  purpose: text('purpose').notNull(), // 'video_call', 'live_stream', etc.
  relatedId: uuid('related_id'), // call_id or stream_id
  status: holdStatusEnum('status').default('active').notNull(),
  settledAt: timestamp('settled_at'),
  releasedAt: timestamp('released_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('spend_holds_user_id_idx').on(table.userId),
  statusIdx: index('spend_holds_status_idx').on(table.status),
}));

// Wallet balances (cached for performance)
// CHECK constraints ensure balance integrity at the database level
export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  balance: integer('balance').default(0).notNull(),
  heldBalance: integer('held_balance').default(0).notNull(), // Amount currently in holds
  lastReconciled: timestamp('last_reconciled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wallets_user_id_idx').on(table.userId),
  // SECURITY: Prevent negative balances at database level
  balanceNonNegative: check('balance_non_negative', sql`${table.balance} >= 0`),
  // SECURITY: Prevent negative held balances
  heldBalanceNonNegative: check('held_balance_non_negative', sql`${table.heldBalance} >= 0`),
  // SECURITY: Held balance cannot exceed total balance
  heldBalanceLimitCheck: check('held_balance_limit', sql`${table.heldBalance} <= ${table.balance}`),
}));

// Creator banking info for payouts
export const creatorBankingInfo = pgTable('creator_banking_info', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  accountHolderName: text('account_holder_name').notNull(),
  accountType: text('account_type').notNull(), // 'checking' or 'savings'
  routingNumber: text('routing_number').notNull(),
  accountNumber: text('account_number').notNull(), // Should be encrypted in production
  bankName: text('bank_name'),
  country: text('country').default('US').notNull(),
  currency: text('currency').default('USD').notNull(),
  isVerified: integer('is_verified').default(0).notNull(), // 0 = false, 1 = true
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('creator_banking_info_creator_id_idx').on(table.creatorId),
}));

// Payout requests from creators
export const payoutRequests = pgTable('payout_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // Amount in coins to be paid out
  status: payoutStatusEnum('status').default('pending').notNull(),
  payoutMethod: payoutMethodEnum('payout_method').default('bank_transfer').notNull(),
  bankingInfoId: uuid('banking_info_id').references(() => creatorBankingInfo.id),
  payoneerPaymentId: text('payoneer_payment_id'), // Payoneer's payment ID for tracking
  externalReference: text('external_reference'), // Our unique reference for Payoneer
  providerStatus: text('provider_status'), // Status from Payoneer API
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at'),
  failureReason: text('failure_reason'),
  transactionId: uuid('transaction_id'), // Links to wallet_transactions
  adminNotes: text('admin_notes'),
  metadata: text('metadata'), // JSON for additional data (e.g., transaction reference)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('payout_requests_creator_id_idx').on(table.creatorId),
  statusIdx: index('payout_requests_status_idx').on(table.status),
  requestedAtIdx: index('payout_requests_requested_at_idx').on(table.requestedAt),
  payoutMethodIdx: index('payout_requests_payout_method_idx').on(table.payoutMethod),
}));

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
export type SpendHold = typeof spendHolds.$inferSelect;
export type NewSpendHold = typeof spendHolds.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type CreatorBankingInfo = typeof creatorBankingInfo.$inferSelect;
export type NewCreatorBankingInfo = typeof creatorBankingInfo.$inferInsert;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type NewPayoutRequest = typeof payoutRequests.$inferInsert;
