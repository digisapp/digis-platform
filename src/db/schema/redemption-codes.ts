import { pgTable, uuid, integer, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const redemptionCodes = pgTable('redemption_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g. "DIGIS-SHOW"
  coinAmount: integer('coin_amount').notNull(), // How many coins this code grants
  batchName: text('batch_name'), // e.g. "LA Show March 2026"
  maxRedemptions: integer('max_redemptions'), // null = unlimited, otherwise cap total uses
  redemptionCount: integer('redemption_count').default(0).notNull(), // How many times redeemed
  expiresAt: timestamp('expires_at'), // Optional expiration
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('redemption_codes_code_idx').on(table.code),
  batchIdx: index('redemption_codes_batch_idx').on(table.batchName),
}));

// Tracks each individual redemption (one per user per code)
export const codeRedemptions = pgTable('code_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  codeId: uuid('code_id').references(() => redemptionCodes.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  redeemedAt: timestamp('redeemed_at').defaultNow().notNull(),
}, (table) => ({
  // Each user can only redeem a code once
  userCodeIdx: uniqueIndex('code_redemptions_user_code_idx').on(table.userId, table.codeId),
  codeIdx: index('code_redemptions_code_idx').on(table.codeId),
}));

export type RedemptionCode = typeof redemptionCodes.$inferSelect;
export type NewRedemptionCode = typeof redemptionCodes.$inferInsert;
export type CodeRedemption = typeof codeRedemptions.$inferSelect;
