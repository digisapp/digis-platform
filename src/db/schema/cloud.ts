import { pgTable, uuid, text, integer, bigint, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { walletTransactions } from './wallet';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const cloudItemTypeEnum = pgEnum('cloud_item_type', ['photo', 'video']);
export const cloudItemStatusEnum = pgEnum('cloud_item_status', ['private', 'live']);
export const cloudPackStatusEnum = pgEnum('cloud_pack_status', ['draft', 'live']);

// ─── Cloud Items ───────────────────────────────────────────────────────────────
// Core content inventory — every upload lands here as 'private' by default

export const cloudItems = pgTable('cloud_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Media
  fileUrl: text('file_url').notNull(),          // Original full-resolution file
  playbackUrl: text('playback_url'),            // Browser-ready version (e.g. remuxed .mp4 for .mov files)
  previewUrl: text('preview_url'),              // Watermarked/blurred for buyer-facing display
  thumbnailUrl: text('thumbnail_url'),          // Compressed grid thumbnail
  type: cloudItemTypeEnum('type').notNull(),
  durationSeconds: integer('duration_seconds'), // Video only
  sizeBytes: bigint('size_bytes', { mode: 'number' }),

  // Processing state
  processingStatus: text('processing_status').default('pending').notNull(), // pending|processing|ready|failed
  processingError: text('processing_error'),
  processingAttempts: integer('processing_attempts').default(0).notNull(),
  processedAt: timestamp('processed_at'),

  // Status & Pricing
  status: cloudItemStatusEnum('status').default('private').notNull(),
  priceCoins: integer('price_coins'),           // Null = unpriced

  // Stats
  likeCount: integer('like_count').default(0).notNull(),

  // Timestamps
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),       // Set when status → live
}, (table) => ({
  creatorIdx: index('cloud_items_creator_idx').on(table.creatorId),
  creatorStatusIdx: index('cloud_items_creator_status_idx').on(table.creatorId, table.status),
  publishedIdx: index('cloud_items_published_idx').on(table.creatorId, table.publishedAt),
  processingIdx: index('cloud_items_processing_idx').on(table.processingStatus),
}));

// ─── Cloud Tags ────────────────────────────────────────────────────────────────
// Internal organization only — never visible to buyers

export const cloudTags = pgTable('cloud_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('cloud_tags_creator_idx').on(table.creatorId),
  uniqueTag: uniqueIndex('cloud_tags_unique').on(table.creatorId, table.name),
}));

// ─── Cloud Item Tags (join) ────────────────────────────────────────────────────

export const cloudItemTags = pgTable('cloud_item_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => cloudItems.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => cloudTags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  itemIdx: index('cloud_item_tags_item_idx').on(table.itemId),
  tagIdx: index('cloud_item_tags_tag_idx').on(table.tagId),
  uniqueItemTag: uniqueIndex('cloud_item_tags_unique').on(table.itemId, table.tagId),
}));

// ─── Cloud Likes ──────────────────────────────────────────────────────────────

export const cloudLikes = pgTable('cloud_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => cloudItems.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  itemIdx: index('cloud_likes_item_idx').on(table.itemId),
  userIdx: index('cloud_likes_user_idx').on(table.userId),
  uniqueLike: uniqueIndex('cloud_likes_unique').on(table.itemId, table.userId),
}));

// ─── Cloud Packs ───────────────────────────────────────────────────────────────
// Sellable bundles — visible on creator's profile when live

export const cloudPacks = pgTable('cloud_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  title: text('title').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),

  // Pricing & Status
  priceCoins: integer('price_coins').notNull(),
  status: cloudPackStatusEnum('status').default('draft').notNull(),

  // Stats (denormalized)
  itemCount: integer('item_count').default(0).notNull(),
  purchaseCount: integer('purchase_count').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('cloud_packs_creator_idx').on(table.creatorId),
  creatorStatusIdx: index('cloud_packs_creator_status_idx').on(table.creatorId, table.status),
}));

// ─── Cloud Pack Items (join) ───────────────────────────────────────────────────

export const cloudPackItems = pgTable('cloud_pack_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').references(() => cloudPacks.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => cloudItems.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => ({
  packIdx: index('cloud_pack_items_pack_idx').on(table.packId),
  uniquePackItem: uniqueIndex('cloud_pack_items_unique').on(table.packId, table.itemId),
}));

// ─── Cloud Purchases ───────────────────────────────────────────────────────────
// Individual item + pack purchases — ties into existing wallet ledger

export const cloudPurchases = pgTable('cloud_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // One of these will be set
  itemId: uuid('item_id').references(() => cloudItems.id, { onDelete: 'cascade' }),
  packId: uuid('pack_id').references(() => cloudPacks.id, { onDelete: 'cascade' }),

  // Transaction
  coinsSpent: integer('coins_spent').notNull(),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),
  idempotencyKey: text('idempotency_key').unique().notNull(),

  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  buyerIdx: index('cloud_purchases_buyer_idx').on(table.buyerId),
  creatorIdx: index('cloud_purchases_creator_idx').on(table.creatorId),
  itemIdx: index('cloud_purchases_item_idx').on(table.itemId),
  packIdx: index('cloud_purchases_pack_idx').on(table.packId),
  // User can only purchase the same item/pack once
  uniqueItemPurchase: uniqueIndex('cloud_purchases_unique_item').on(table.buyerId, table.itemId),
  uniquePackPurchase: uniqueIndex('cloud_purchases_unique_pack').on(table.buyerId, table.packId),
}));

// ─── Creator Pricing Defaults ────────────────────────────────────────────────
// Set once, applied via "Price All" — reduces decision paralysis

export const creatorPricingDefaults = pgTable('creator_pricing_defaults', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  photoPriceCoins: integer('photo_price_coins'),         // Default price for photos
  shortVideoPriceCoins: integer('short_video_price_coins'), // Videos < 60s
  longVideoPriceCoins: integer('long_video_price_coins'),   // Videos >= 60s
  packDiscountPct: integer('pack_discount_pct').default(30), // % off individual total for packs

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: uniqueIndex('creator_pricing_defaults_creator_idx').on(table.creatorId),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const cloudItemsRelations = relations(cloudItems, ({ one, many }) => ({
  creator: one(users, {
    fields: [cloudItems.creatorId],
    references: [users.id],
  }),
  tags: many(cloudItemTags),
  likes: many(cloudLikes),
  packItems: many(cloudPackItems),
  purchases: many(cloudPurchases),
}));

export const cloudTagsRelations = relations(cloudTags, ({ one, many }) => ({
  creator: one(users, {
    fields: [cloudTags.creatorId],
    references: [users.id],
  }),
  itemTags: many(cloudItemTags),
}));

export const cloudItemTagsRelations = relations(cloudItemTags, ({ one }) => ({
  item: one(cloudItems, {
    fields: [cloudItemTags.itemId],
    references: [cloudItems.id],
  }),
  tag: one(cloudTags, {
    fields: [cloudItemTags.tagId],
    references: [cloudTags.id],
  }),
}));

export const cloudPacksRelations = relations(cloudPacks, ({ one, many }) => ({
  creator: one(users, {
    fields: [cloudPacks.creatorId],
    references: [users.id],
  }),
  items: many(cloudPackItems),
  purchases: many(cloudPurchases),
}));

export const cloudPackItemsRelations = relations(cloudPackItems, ({ one }) => ({
  pack: one(cloudPacks, {
    fields: [cloudPackItems.packId],
    references: [cloudPacks.id],
  }),
  item: one(cloudItems, {
    fields: [cloudPackItems.itemId],
    references: [cloudItems.id],
  }),
}));

export const cloudLikesRelations = relations(cloudLikes, ({ one }) => ({
  item: one(cloudItems, {
    fields: [cloudLikes.itemId],
    references: [cloudItems.id],
  }),
  user: one(users, {
    fields: [cloudLikes.userId],
    references: [users.id],
  }),
}));

export const cloudPurchasesRelations = relations(cloudPurchases, ({ one }) => ({
  buyer: one(users, {
    fields: [cloudPurchases.buyerId],
    references: [users.id],
    relationName: 'cloudPurchaseBuyer',
  }),
  creator: one(users, {
    fields: [cloudPurchases.creatorId],
    references: [users.id],
    relationName: 'cloudPurchaseCreator',
  }),
  item: one(cloudItems, {
    fields: [cloudPurchases.itemId],
    references: [cloudItems.id],
  }),
  pack: one(cloudPacks, {
    fields: [cloudPurchases.packId],
    references: [cloudPacks.id],
  }),
  transaction: one(walletTransactions, {
    fields: [cloudPurchases.transactionId],
    references: [walletTransactions.id],
  }),
}));

export const creatorPricingDefaultsRelations = relations(creatorPricingDefaults, ({ one }) => ({
  creator: one(users, {
    fields: [creatorPricingDefaults.creatorId],
    references: [users.id],
  }),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────

export type CloudItem = typeof cloudItems.$inferSelect;
export type NewCloudItem = typeof cloudItems.$inferInsert;
export type CloudTag = typeof cloudTags.$inferSelect;
export type NewCloudTag = typeof cloudTags.$inferInsert;
export type CloudItemTag = typeof cloudItemTags.$inferSelect;
export type NewCloudItemTag = typeof cloudItemTags.$inferInsert;
export type CloudPack = typeof cloudPacks.$inferSelect;
export type NewCloudPack = typeof cloudPacks.$inferInsert;
export type CloudPackItem = typeof cloudPackItems.$inferSelect;
export type NewCloudPackItem = typeof cloudPackItems.$inferInsert;
export type CloudPurchase = typeof cloudPurchases.$inferSelect;
export type NewCloudPurchase = typeof cloudPurchases.$inferInsert;
export type CloudLike = typeof cloudLikes.$inferSelect;
export type NewCloudLike = typeof cloudLikes.$inferInsert;
export type CreatorPricingDefaults = typeof creatorPricingDefaults.$inferSelect;
export type NewCreatorPricingDefaults = typeof creatorPricingDefaults.$inferInsert;
