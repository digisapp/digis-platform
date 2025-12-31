import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Referral status enum
export const referralStatusEnum = pgEnum('referral_status', [
  'pending',    // Referred user signed up but not yet verified as creator
  'active',     // Referred creator is active, commissions being tracked
  'expired',    // 12-month commission period ended
  'churned',    // Referred creator deleted account or became inactive
]);

// Commission payout status
export const commissionStatusEnum = pgEnum('commission_status', [
  'pending',    // Accumulated but not yet paid (below 100 coin threshold)
  'ready',      // Ready to be paid (100+ coins)
  'paid',       // Paid to referrer's wallet
]);

// Main referrals table
export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Who referred whom
  referrerId: uuid('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredId: uuid('referred_id').references(() => users.id, { onDelete: 'set null' }),

  // Referral tracking
  referralCode: text('referral_code').notNull(), // Usually the username
  status: referralStatusEnum('status').notNull().default('pending'),

  // One-time signup bonus
  signupBonusPaid: boolean('signup_bonus_paid').notNull().default(false),
  signupBonusAmount: integer('signup_bonus_amount').notNull().default(100),

  // Revenue share settings
  revenueSharePercent: decimal('revenue_share_percent', { precision: 5, scale: 2 }).notNull().default('5.00'),
  revenueShareExpiresAt: timestamp('revenue_share_expires_at'), // 12 months from activation

  // Lifetime stats
  totalCommissionEarned: integer('total_commission_earned').notNull().default(0),
  pendingCommission: integer('pending_commission').notNull().default(0), // Accumulated but not yet paid

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  activatedAt: timestamp('activated_at'), // When referred user became active creator
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Monthly commission records
export const referralCommissions = pgTable('referral_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),

  referralId: uuid('referral_id').notNull().references(() => referrals.id, { onDelete: 'cascade' }),

  // Period tracking
  periodMonth: text('period_month').notNull(), // Format: "2025-01"
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  // Earnings calculation
  referredEarnings: integer('referred_earnings').notNull().default(0), // Total coins earned by referred creator
  commissionPercent: decimal('commission_percent', { precision: 5, scale: 2 }).notNull(),
  commissionAmount: integer('commission_amount').notNull().default(0), // 5% of earnings

  // Payout status
  status: commissionStatusEnum('status').notNull().default('pending'),
  paidAt: timestamp('paid_at'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const referralsRelations = relations(referrals, ({ one, many }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: 'referrer',
  }),
  referred: one(users, {
    fields: [referrals.referredId],
    references: [users.id],
    relationName: 'referred',
  }),
  commissions: many(referralCommissions),
}));

export const referralCommissionsRelations = relations(referralCommissions, ({ one }) => ({
  referral: one(referrals, {
    fields: [referralCommissions.referralId],
    references: [referrals.id],
  }),
}));
