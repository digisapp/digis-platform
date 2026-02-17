import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { contentItems } from './content';
import { vods } from './vods';
import { walletTransactions } from './wallet';

// Collections - ordered, optionally-priced content bundles
export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Details
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),

  // Pricing
  priceCoins: integer('price_coins').default(0).notNull(), // 0 = free
  subscribersOnly: boolean('subscribers_only').default(false).notNull(),

  // Status
  isPublished: boolean('is_published').default(true).notNull(),

  // Stats (denormalized)
  itemCount: integer('item_count').default(0).notNull(),
  purchaseCount: integer('purchase_count').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),

  // Display
  displayOrder: integer('display_order').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorPublishedIdx: index('collections_creator_published_idx').on(table.creatorId, table.isPublished),
  creatorOrderIdx: index('collections_creator_order_idx').on(table.creatorId, table.displayOrder),
}));

// Items within a collection (content or VODs)
export const collectionItems = pgTable('collection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  contentId: uuid('content_id').references(() => contentItems.id, { onDelete: 'cascade' }),
  vodId: uuid('vod_id').references(() => vods.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => ({
  collectionPositionIdx: index('collection_items_position_idx').on(table.collectionId, table.position),
  uniqueContent: uniqueIndex('collection_items_unique_content').on(table.collectionId, table.contentId),
  uniqueVod: uniqueIndex('collection_items_unique_vod').on(table.collectionId, table.vodId),
}));

// Collection purchases - who bought access
export const collectionPurchases = pgTable('collection_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  coinsSpent: integer('coins_spent').notNull(),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('collection_purchases_user_idx').on(table.userId),
  collectionIdx: index('collection_purchases_collection_idx').on(table.collectionId),
  uniquePurchase: uniqueIndex('collection_purchases_unique').on(table.collectionId, table.userId),
}));

// Collection progress tracking per user
export const collectionProgress = pgTable('collection_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').references(() => collections.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  completedItems: integer('completed_items').default(0).notNull(),
  totalItems: integer('total_items').notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('collection_progress_user_idx').on(table.userId),
  collectionIdx: index('collection_progress_collection_idx').on(table.collectionId),
  uniqueProgress: uniqueIndex('collection_progress_unique').on(table.collectionId, table.userId),
}));

// Relations
export const collectionsRelations = relations(collections, ({ one, many }) => ({
  creator: one(users, {
    fields: [collections.creatorId],
    references: [users.id],
  }),
  items: many(collectionItems),
  purchases: many(collectionPurchases),
  progress: many(collectionProgress),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
  content: one(contentItems, {
    fields: [collectionItems.contentId],
    references: [contentItems.id],
  }),
  vod: one(vods, {
    fields: [collectionItems.vodId],
    references: [vods.id],
  }),
}));

export const collectionPurchasesRelations = relations(collectionPurchases, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionPurchases.collectionId],
    references: [collections.id],
  }),
  user: one(users, {
    fields: [collectionPurchases.userId],
    references: [users.id],
  }),
  transaction: one(walletTransactions, {
    fields: [collectionPurchases.transactionId],
    references: [walletTransactions.id],
  }),
}));

export const collectionProgressRelations = relations(collectionProgress, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionProgress.collectionId],
    references: [collections.id],
  }),
  user: one(users, {
    fields: [collectionProgress.userId],
    references: [users.id],
  }),
}));

// Type exports
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type NewCollectionItem = typeof collectionItems.$inferInsert;
export type CollectionPurchase = typeof collectionPurchases.$inferSelect;
export type NewCollectionPurchase = typeof collectionPurchases.$inferInsert;
export type CollectionProgress = typeof collectionProgress.$inferSelect;
export type NewCollectionProgress = typeof collectionProgress.$inferInsert;
