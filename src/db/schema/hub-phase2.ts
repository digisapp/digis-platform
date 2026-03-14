import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { hubItems } from './hub';
import { walletTransactions } from './wallet';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const scheduledDropStatusEnum = pgEnum('scheduled_drop_status', ['scheduled', 'published', 'cancelled']);
export const lockedMessageSegmentEnum = pgEnum('locked_message_segment', ['individual', 'top_fans', 'all_followers']);

// ─── Scheduled Drops ─────────────────────────────────────────────────────────
// Creator schedules Hub items to auto-publish on future dates

export const hubScheduledDrops = pgTable('hub_scheduled_drops', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => hubItems.id, { onDelete: 'cascade' }).notNull(),

  scheduledFor: timestamp('scheduled_for').notNull(),
  status: scheduledDropStatusEnum('status').default('scheduled').notNull(),
  publishedAt: timestamp('published_at'),

  // Batch tracking — items scheduled together share a batchId
  batchId: uuid('batch_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('hub_scheduled_drops_creator_idx').on(table.creatorId),
  statusIdx: index('hub_scheduled_drops_status_idx').on(table.creatorId, table.status),
  scheduledIdx: index('hub_scheduled_drops_scheduled_idx').on(table.scheduledFor, table.status),
  itemIdx: index('hub_scheduled_drops_item_idx').on(table.itemId),
  batchIdx: index('hub_scheduled_drops_batch_idx').on(table.batchId),
}));

// ─── Creator Streaks ─────────────────────────────────────────────────────────
// Track consecutive days with content going live

export const hubCreatorStreaks = pgTable('hub_creator_streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActiveDate: timestamp('last_active_date'), // Date of last content going live

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: uniqueIndex('hub_creator_streaks_creator_idx').on(table.creatorId),
}));

// ─── Locked Messages ─────────────────────────────────────────────────────────
// Creator sends paid Hub content directly to fans via DM

export const hubLockedMessages = pgTable('hub_locked_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  messageText: text('message_text'),           // Optional caption
  priceCoins: integer('price_coins').notNull(),
  segment: lockedMessageSegmentEnum('segment').notNull(),

  // Stats (denormalized)
  recipientCount: integer('recipient_count').default(0).notNull(),
  unlockCount: integer('unlock_count').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),

  sentAt: timestamp('sent_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('hub_locked_messages_creator_idx').on(table.creatorId),
}));

// ─── Locked Message Items (join) ─────────────────────────────────────────────

export const hubLockedMessageItems = pgTable('hub_locked_message_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => hubLockedMessages.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => hubItems.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  messageIdx: index('hub_locked_message_items_message_idx').on(table.messageId),
  uniqueItem: uniqueIndex('hub_locked_message_items_unique').on(table.messageId, table.itemId),
}));

// ─── Locked Message Recipients ───────────────────────────────────────────────

export const hubLockedMessageRecipients = pgTable('hub_locked_message_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => hubLockedMessages.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  unlocked: boolean('unlocked').default(false).notNull(),
  unlockedAt: timestamp('unlocked_at'),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),

  sentAt: timestamp('sent_at').defaultNow().notNull(),
}, (table) => ({
  messageIdx: index('hub_locked_msg_recipients_message_idx').on(table.messageId),
  recipientIdx: index('hub_locked_msg_recipients_recipient_idx').on(table.recipientId),
  uniqueRecipient: uniqueIndex('hub_locked_msg_recipients_unique').on(table.messageId, table.recipientId),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const hubScheduledDropsRelations = relations(hubScheduledDrops, ({ one }) => ({
  creator: one(users, { fields: [hubScheduledDrops.creatorId], references: [users.id] }),
  item: one(hubItems, { fields: [hubScheduledDrops.itemId], references: [hubItems.id] }),
}));

export const hubCreatorStreaksRelations = relations(hubCreatorStreaks, ({ one }) => ({
  creator: one(users, { fields: [hubCreatorStreaks.creatorId], references: [users.id] }),
}));

export const hubLockedMessagesRelations = relations(hubLockedMessages, ({ one, many }) => ({
  creator: one(users, { fields: [hubLockedMessages.creatorId], references: [users.id] }),
  items: many(hubLockedMessageItems),
  recipients: many(hubLockedMessageRecipients),
}));

export const hubLockedMessageItemsRelations = relations(hubLockedMessageItems, ({ one }) => ({
  message: one(hubLockedMessages, { fields: [hubLockedMessageItems.messageId], references: [hubLockedMessages.id] }),
  item: one(hubItems, { fields: [hubLockedMessageItems.itemId], references: [hubItems.id] }),
}));

export const hubLockedMessageRecipientsRelations = relations(hubLockedMessageRecipients, ({ one }) => ({
  message: one(hubLockedMessages, { fields: [hubLockedMessageRecipients.messageId], references: [hubLockedMessages.id] }),
  recipient: one(users, { fields: [hubLockedMessageRecipients.recipientId], references: [users.id] }),
  transaction: one(walletTransactions, { fields: [hubLockedMessageRecipients.transactionId], references: [walletTransactions.id] }),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type HubScheduledDrop = typeof hubScheduledDrops.$inferSelect;
export type NewHubScheduledDrop = typeof hubScheduledDrops.$inferInsert;
export type HubCreatorStreak = typeof hubCreatorStreaks.$inferSelect;
export type NewHubCreatorStreak = typeof hubCreatorStreaks.$inferInsert;
export type HubLockedMessage = typeof hubLockedMessages.$inferSelect;
export type NewHubLockedMessage = typeof hubLockedMessages.$inferInsert;
export type HubLockedMessageItem = typeof hubLockedMessageItems.$inferSelect;
export type NewHubLockedMessageItem = typeof hubLockedMessageItems.$inferInsert;
export type HubLockedMessageRecipient = typeof hubLockedMessageRecipients.$inferSelect;
export type NewHubLockedMessageRecipient = typeof hubLockedMessageRecipients.$inferInsert;
