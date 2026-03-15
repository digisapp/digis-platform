import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { cloudItems } from './cloud';
import { walletTransactions } from './wallet';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const scheduledDropStatusEnum = pgEnum('scheduled_drop_status', ['scheduled', 'published', 'cancelled']);
export const lockedMessageSegmentEnum = pgEnum('locked_message_segment', ['individual', 'top_fans', 'all_followers']);

// ─── Scheduled Drops ─────────────────────────────────────────────────────────
// Creator schedules Cloud items to auto-publish on future dates

export const cloudScheduledDrops = pgTable('cloud_scheduled_drops', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => cloudItems.id, { onDelete: 'cascade' }).notNull(),

  scheduledFor: timestamp('scheduled_for').notNull(),
  status: scheduledDropStatusEnum('status').default('scheduled').notNull(),
  publishedAt: timestamp('published_at'),

  // Batch tracking — items scheduled together share a batchId
  batchId: uuid('batch_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('cloud_scheduled_drops_creator_idx').on(table.creatorId),
  statusIdx: index('cloud_scheduled_drops_status_idx').on(table.creatorId, table.status),
  scheduledIdx: index('cloud_scheduled_drops_scheduled_idx').on(table.scheduledFor, table.status),
  itemIdx: index('cloud_scheduled_drops_item_idx').on(table.itemId),
  batchIdx: index('cloud_scheduled_drops_batch_idx').on(table.batchId),
}));

// ─── Creator Streaks ─────────────────────────────────────────────────────────
// Track consecutive days with content going live

export const cloudCreatorStreaks = pgTable('cloud_creator_streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActiveDate: timestamp('last_active_date'), // Date of last content going live

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: uniqueIndex('cloud_creator_streaks_creator_idx').on(table.creatorId),
}));

// ─── Locked Messages ─────────────────────────────────────────────────────────
// Creator sends paid Cloud content directly to fans via DM

export const cloudLockedMessages = pgTable('cloud_locked_messages', {
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
  creatorIdx: index('cloud_locked_messages_creator_idx').on(table.creatorId),
}));

// ─── Locked Message Items (join) ─────────────────────────────────────────────

export const cloudLockedMessageItems = pgTable('cloud_locked_message_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => cloudLockedMessages.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => cloudItems.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  messageIdx: index('cloud_locked_message_items_message_idx').on(table.messageId),
  uniqueItem: uniqueIndex('cloud_locked_message_items_unique').on(table.messageId, table.itemId),
}));

// ─── Locked Message Recipients ───────────────────────────────────────────────

export const cloudLockedMessageRecipients = pgTable('cloud_locked_message_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').references(() => cloudLockedMessages.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  unlocked: boolean('unlocked').default(false).notNull(),
  unlockedAt: timestamp('unlocked_at'),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),

  sentAt: timestamp('sent_at').defaultNow().notNull(),
}, (table) => ({
  messageIdx: index('cloud_locked_msg_recipients_message_idx').on(table.messageId),
  recipientIdx: index('cloud_locked_msg_recipients_recipient_idx').on(table.recipientId),
  uniqueRecipient: uniqueIndex('cloud_locked_msg_recipients_unique').on(table.messageId, table.recipientId),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const cloudScheduledDropsRelations = relations(cloudScheduledDrops, ({ one }) => ({
  creator: one(users, { fields: [cloudScheduledDrops.creatorId], references: [users.id] }),
  item: one(cloudItems, { fields: [cloudScheduledDrops.itemId], references: [cloudItems.id] }),
}));

export const cloudCreatorStreaksRelations = relations(cloudCreatorStreaks, ({ one }) => ({
  creator: one(users, { fields: [cloudCreatorStreaks.creatorId], references: [users.id] }),
}));

export const cloudLockedMessagesRelations = relations(cloudLockedMessages, ({ one, many }) => ({
  creator: one(users, { fields: [cloudLockedMessages.creatorId], references: [users.id] }),
  items: many(cloudLockedMessageItems),
  recipients: many(cloudLockedMessageRecipients),
}));

export const cloudLockedMessageItemsRelations = relations(cloudLockedMessageItems, ({ one }) => ({
  message: one(cloudLockedMessages, { fields: [cloudLockedMessageItems.messageId], references: [cloudLockedMessages.id] }),
  item: one(cloudItems, { fields: [cloudLockedMessageItems.itemId], references: [cloudItems.id] }),
}));

export const cloudLockedMessageRecipientsRelations = relations(cloudLockedMessageRecipients, ({ one }) => ({
  message: one(cloudLockedMessages, { fields: [cloudLockedMessageRecipients.messageId], references: [cloudLockedMessages.id] }),
  recipient: one(users, { fields: [cloudLockedMessageRecipients.recipientId], references: [users.id] }),
  transaction: one(walletTransactions, { fields: [cloudLockedMessageRecipients.transactionId], references: [walletTransactions.id] }),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type CloudScheduledDrop = typeof cloudScheduledDrops.$inferSelect;
export type NewCloudScheduledDrop = typeof cloudScheduledDrops.$inferInsert;
export type CloudCreatorStreak = typeof cloudCreatorStreaks.$inferSelect;
export type NewCloudCreatorStreak = typeof cloudCreatorStreaks.$inferInsert;
export type CloudLockedMessage = typeof cloudLockedMessages.$inferSelect;
export type NewCloudLockedMessage = typeof cloudLockedMessages.$inferInsert;
export type CloudLockedMessageItem = typeof cloudLockedMessageItems.$inferSelect;
export type NewCloudLockedMessageItem = typeof cloudLockedMessageItems.$inferInsert;
export type CloudLockedMessageRecipient = typeof cloudLockedMessageRecipients.$inferSelect;
export type NewCloudLockedMessageRecipient = typeof cloudLockedMessageRecipients.$inferInsert;
