import { pgTable, uuid, integer, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'purchase',
  'gift',
  'call_charge',
  'call_earnings',
  'stream_tip',
  'ppv_unlock',
  'creator_payout',
  'refund',
  'dm_tip',
  'locked_message'
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'completed',
  'failed',
  'refunded'
]);

export const holdStatusEnum = pgEnum('hold_status', ['active', 'settled', 'released']);

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
  idempotencyIdx: index('wallet_transactions_idempotency_idx').on(table.idempotencyKey),
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
}));

export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
export type SpendHold = typeof spendHolds.$inferSelect;
export type NewSpendHold = typeof spendHolds.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
