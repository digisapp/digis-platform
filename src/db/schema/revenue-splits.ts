import { pgTable, uuid, text, integer, timestamp, index, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// ─── Platform Fee Config ─────────────────────────────────────────────────────
// Global and per-creator platform fee overrides

export const platformFeeConfig = pgTable('platform_fee_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),      // e.g. 'default', 'streams', 'calls', 'cloud', 'subscriptions'
  feePercent: decimal('fee_percent', { precision: 5, scale: 2 }).notNull().default('20.00'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// ─── Creator Revenue Splits ──────────────────────────────────────────────────
// Per-creator custom split overrides (agency deals, VIP creators, etc.)

export const creatorRevenueSplits = pgTable('creator_revenue_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Platform cut override (null = use global default)
  platformFeePercent: decimal('platform_fee_percent', { precision: 5, scale: 2 }),

  // Agency/partner split — portion of creator's earnings goes to agency
  agencyId: uuid('agency_id').references(() => users.id),  // Agency user account
  agencyFeePercent: decimal('agency_fee_percent', { precision: 5, scale: 2 }),
  agencyName: text('agency_name'),                          // Display name for agency

  // Effective dates
  effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
  effectiveUntil: timestamp('effective_until'),              // Null = indefinite
  isActive: boolean('is_active').default(true).notNull(),

  // Audit
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('creator_revenue_splits_creator_idx').on(table.creatorId),
  agencyIdx: index('creator_revenue_splits_agency_idx').on(table.agencyId),
}));

// ─── Revenue Split Ledger ────────────────────────────────────────────────────
// Records each split applied to a transaction for full audit trail

export const revenueSplitLedger = pgTable('revenue_split_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: text('transaction_id').notNull(),       // wallet_transactions.id
  creatorId: uuid('creator_id').notNull(),
  grossAmount: integer('gross_amount').notNull(),         // Total coins before splits
  platformFeePercent: decimal('platform_fee_percent', { precision: 5, scale: 2 }).notNull(),
  platformFeeAmount: integer('platform_fee_amount').notNull(),
  agencyFeePercent: decimal('agency_fee_percent', { precision: 5, scale: 2 }),
  agencyFeeAmount: integer('agency_fee_amount'),
  agencyId: uuid('agency_id'),
  creatorNetAmount: integer('creator_net_amount').notNull(), // What creator actually receives
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  transactionIdx: index('revenue_split_ledger_tx_idx').on(table.transactionId),
  creatorIdx: index('revenue_split_ledger_creator_idx').on(table.creatorId),
  agencyIdx: index('revenue_split_ledger_agency_idx').on(table.agencyId),
}));

// ─── Fan Referrals ───────────────────────────────────────────────────────────
// Fans refer other fans — both get coin rewards

export const fanReferrals = pgTable('fan_referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  referredId: uuid('referred_id').references(() => users.id, { onDelete: 'set null' }),

  referralCode: text('referral_code').notNull().unique(),
  status: text('status').notNull().default('pending'),  // pending, completed, expired

  // Rewards
  referrerRewardCoins: integer('referrer_reward_coins').notNull().default(50),
  referredRewardCoins: integer('referred_reward_coins').notNull().default(50),
  referrerRewardPaid: boolean('referrer_reward_paid').default(false).notNull(),
  referredRewardPaid: boolean('referred_reward_paid').default(false).notNull(),

  // Tracking
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  referrerIdx: index('fan_referrals_referrer_idx').on(table.referrerId),
  referredIdx: index('fan_referrals_referred_idx').on(table.referredId),
  codeIdx: index('fan_referrals_code_idx').on(table.referralCode),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const creatorRevenueSplitsRelations = relations(creatorRevenueSplits, ({ one }) => ({
  creator: one(users, { fields: [creatorRevenueSplits.creatorId], references: [users.id] }),
  agency: one(users, { fields: [creatorRevenueSplits.agencyId], references: [users.id] }),
}));

export const fanReferralsRelations = relations(fanReferrals, ({ one }) => ({
  referrer: one(users, { fields: [fanReferrals.referrerId], references: [users.id], relationName: 'fanReferrer' }),
  referred: one(users, { fields: [fanReferrals.referredId], references: [users.id], relationName: 'fanReferred' }),
}));
