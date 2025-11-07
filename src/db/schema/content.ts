import { pgTable, uuid, text, integer, boolean, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { walletTransactions } from './wallet';

export const contentTypeEnum = pgEnum('content_type', ['photo', 'video', 'gallery']);

export const contentItems = pgTable('content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Content Details
  title: text('title').notNull(),
  description: text('description'),
  contentType: contentTypeEnum('content_type').notNull(),

  // Pricing
  unlockPrice: integer('unlock_price').notNull(), // In coins
  isFree: boolean('is_free').default(false),

  // Media URLs
  thumbnailUrl: text('thumbnail_url').notNull(),
  mediaUrl: text('media_url').notNull(), // Can be single file or JSON for galleries
  durationSeconds: integer('duration_seconds'), // For videos

  // Stats
  viewCount: integer('view_count').default(0).notNull(),
  purchaseCount: integer('purchase_count').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),

  // Status
  isPublished: boolean('is_published').default(true).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('content_items_creator_idx').on(table.creatorId),
  publishedIdx: index('content_items_published_idx').on(table.isPublished, table.createdAt),
}));

export const contentPurchases = pgTable('content_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => contentItems.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Transaction
  coinsSpent: integer('coins_spent').notNull(),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),

  // Access
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('content_purchases_user_idx').on(table.userId),
  contentIdx: index('content_purchases_content_idx').on(table.contentId),
  // Unique constraint: user can only purchase content once
  uniquePurchase: index('content_purchases_unique').on(table.contentId, table.userId),
}));

export const contentTags = pgTable('content_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => contentItems.id, { onDelete: 'cascade' }).notNull(),
  tag: text('tag').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  contentIdx: index('content_tags_content_idx').on(table.contentId),
  tagIdx: index('content_tags_tag_idx').on(table.tag),
}));

export type ContentItem = typeof contentItems.$inferSelect;
export type NewContentItem = typeof contentItems.$inferInsert;
export type ContentPurchase = typeof contentPurchases.$inferSelect;
export type NewContentPurchase = typeof contentPurchases.$inferInsert;
export type ContentTag = typeof contentTags.$inferSelect;
export type NewContentTag = typeof contentTags.$inferInsert;
