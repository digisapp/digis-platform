import { pgTable, uuid, text, timestamp, boolean, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const inviteStatusEnum = pgEnum('invite_status', ['pending', 'claimed', 'expired', 'revoked']);

// Creator invites for bulk onboarding
export const creatorInvites = pgTable('creator_invites', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Unique claim code (URL-safe, 12 characters)
  code: text('code').notNull().unique(),

  // Pre-filled creator info from CSV
  instagramHandle: text('instagram_handle').notNull(),
  email: text('email'), // Optional - creator can set during claim if not provided
  displayName: text('display_name'), // Optional - defaults to Instagram handle

  // Status tracking
  status: inviteStatusEnum('status').default('pending').notNull(),

  // Claim info
  claimedBy: uuid('claimed_by').references(() => users.id, { onDelete: 'set null' }),
  claimedAt: timestamp('claimed_at'),

  // Expiration (optional - null means no expiration)
  expiresAt: timestamp('expires_at'),

  // Audit trail
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }), // Admin who created
  batchId: text('batch_id'), // Group invites by upload batch for tracking
  notes: text('notes'), // Admin notes

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('creator_invites_code_idx').on(table.code),
  statusIdx: index('creator_invites_status_idx').on(table.status),
  instagramIdx: index('creator_invites_instagram_idx').on(table.instagramHandle),
  batchIdx: index('creator_invites_batch_idx').on(table.batchId),
  expiresIdx: index('creator_invites_expires_idx').on(table.expiresAt),
}));

// Relations
export const creatorInvitesRelations = relations(creatorInvites, ({ one }) => ({
  claimedByUser: one(users, {
    fields: [creatorInvites.claimedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [creatorInvites.createdBy],
    references: [users.id],
  }),
}));

// Types
export type CreatorInvite = typeof creatorInvites.$inferSelect;
export type NewCreatorInvite = typeof creatorInvites.$inferInsert;
