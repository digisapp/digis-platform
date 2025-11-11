import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'cancelled',
  'expired',
  'paused'
]);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'basic',
  'bronze',
  'silver',
  'gold',
  'platinum'
]);

// Subscription tiers created by creators
export const subscriptionTiers = pgTable('subscription_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // "Bronze Supporter", "Gold VIP", etc.
  tier: subscriptionTierEnum('tier').default('basic').notNull(),
  description: text('description'),
  pricePerMonth: integer('price_per_month').notNull(), // Price in coins
  benefits: text('benefits'), // JSON array of benefits
  isActive: boolean('is_active').default(true).notNull(),
  subscriberCount: integer('subscriber_count').default(0).notNull(),
  displayOrder: integer('display_order').default(0).notNull(), // For sorting tiers
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('subscription_tiers_creator_id_idx').on(table.creatorId),
  tierIdx: index('subscription_tiers_tier_idx').on(table.tier),
}));

// Active subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tierId: uuid('tier_id').references(() => subscriptionTiers.id, { onDelete: 'cascade' }).notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // When current period ends
  cancelledAt: timestamp('cancelled_at'),
  lastPaymentAt: timestamp('last_payment_at'),
  nextBillingAt: timestamp('next_billing_at'),
  totalPaid: integer('total_paid').default(0).notNull(), // Total coins paid lifetime
  failedPaymentCount: integer('failed_payment_count').default(0).notNull(),
  autoRenew: boolean('auto_renew').default(false).notNull(), // For Phase 3
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  creatorIdIdx: index('subscriptions_creator_id_idx').on(table.creatorId),
  statusIdx: index('subscriptions_status_idx').on(table.status),
  expiresAtIdx: index('subscriptions_expires_at_idx').on(table.expiresAt),
  userCreatorIdx: index('subscriptions_user_creator_idx').on(table.userId, table.creatorId),
}));

// Subscription payment history
export const subscriptionPayments = pgTable('subscription_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // Amount in coins
  status: text('status').notNull(), // 'completed', 'failed', 'refunded'
  transactionId: uuid('transaction_id'), // Links to wallet_transactions
  billingPeriodStart: timestamp('billing_period_start').notNull(),
  billingPeriodEnd: timestamp('billing_period_end').notNull(),
  paidAt: timestamp('paid_at'),
  failureReason: text('failure_reason'),
  metadata: text('metadata'), // JSON for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  subscriptionIdIdx: index('subscription_payments_subscription_id_idx').on(table.subscriptionId),
  userIdIdx: index('subscription_payments_user_id_idx').on(table.userId),
  creatorIdIdx: index('subscription_payments_creator_id_idx').on(table.creatorId),
  paidAtIdx: index('subscription_payments_paid_at_idx').on(table.paidAt),
}));

export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type NewSubscriptionTier = typeof subscriptionTiers.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type NewSubscriptionPayment = typeof subscriptionPayments.$inferInsert;
