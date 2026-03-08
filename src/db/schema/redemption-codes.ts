import { pgTable, uuid, integer, text, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const redemptionCodes = pgTable('redemption_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g. "DIGIS-7X3K"
  coinAmount: integer('coin_amount').notNull(), // How many coins this code grants
  batchName: text('batch_name'), // e.g. "LA Show March 2026"
  isRedeemed: boolean('is_redeemed').default(false).notNull(),
  redeemedByUserId: uuid('redeemed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  redeemedAt: timestamp('redeemed_at'),
  expiresAt: timestamp('expires_at'), // Optional expiration
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('redemption_codes_code_idx').on(table.code),
  batchIdx: index('redemption_codes_batch_idx').on(table.batchName),
  redeemedIdx: index('redemption_codes_redeemed_idx').on(table.isRedeemed),
}));

export type RedemptionCode = typeof redemptionCodes.$inferSelect;
export type NewRedemptionCode = typeof redemptionCodes.$inferInsert;
