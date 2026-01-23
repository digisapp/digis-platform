import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const payeeStatusEnum = pgEnum('payee_status', [
  'not_registered',
  'pending',
  'active',
  'inactive',
  'declined'
]);

// Creator's Payoneer account info
export const creatorPayoneerInfo = pgTable('creator_payoneer_info', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  payeeId: text('payee_id'), // Payoneer's payee ID after registration
  payeeStatus: payeeStatusEnum('payee_status').default('not_registered').notNull(),
  registrationLink: text('registration_link'), // URL for creator to complete Payoneer signup
  registrationLinkExpiresAt: timestamp('registration_link_expires_at'),
  preferredCurrency: text('preferred_currency').default('USD'),
  email: text('email'), // Email used for Payoneer registration
  metadata: text('metadata'), // JSON for additional data from Payoneer
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('creator_payoneer_info_creator_id_idx').on(table.creatorId),
  payeeIdIdx: index('creator_payoneer_info_payee_id_idx').on(table.payeeId),
  payeeStatusIdx: index('creator_payoneer_info_payee_status_idx').on(table.payeeStatus),
}));

export type CreatorPayoneerInfo = typeof creatorPayoneerInfo.$inferSelect;
export type NewCreatorPayoneerInfo = typeof creatorPayoneerInfo.$inferInsert;
