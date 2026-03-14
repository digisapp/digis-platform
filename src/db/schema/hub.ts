import { pgTable, uuid, text, integer, bigint, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { walletTransactions } from './wallet';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const hubItemTypeEnum = pgEnum('hub_item_type', ['photo', 'video']);
export const hubItemStatusEnum = pgEnum('hub_item_status', ['private', 'ready', 'live']);
export const hubPackStatusEnum = pgEnum('hub_pack_status', ['draft', 'live']);

// ─── Hub Items ───────────────────────────────────────────────────────────────
// Core content inventory — every upload lands here as 'private' by default

export const hubItems = pgTable('hub_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Media
  fileUrl: text('file_url').notNull(),          // Original full-resolution file
  previewUrl: text('preview_url'),              // Watermarked/blurred for buyer-facing display
  thumbnailUrl: text('thumbnail_url'),          // Compressed grid thumbnail
  type: hubItemTypeEnum('type').notNull(),
  durationSeconds: integer('duration_seconds'), // Video only
  sizeBytes: bigint('size_bytes', { mode: 'number' }),

  // Status & Pricing
  status: hubItemStatusEnum('status').default('private').notNull(),
  priceCoins: integer('price_coins'),           // Null = unpriced

  // Timestamps
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),       // Set when status → live
}, (table) => ({
  creatorIdx: index('hub_items_creator_idx').on(table.creatorId),
  creatorStatusIdx: index('hub_items_creator_status_idx').on(table.creatorId, table.status),
  publishedIdx: index('hub_items_published_idx').on(table.creatorId, table.publishedAt),
}));

// ─── Hub Tags ────────────────────────────────────────────────────────────────
// Internal organization only — never visible to buyers

export const hubTags = pgTable('hub_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('hub_tags_creator_idx').on(table.creatorId),
  uniqueTag: uniqueIndex('hub_tags_unique').on(table.creatorId, table.name),
}));

// ─── Hub Item Tags (join) ────────────────────────────────────────────────────

export const hubItemTags = pgTable('hub_item_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id').references(() => hubItems.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => hubTags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  itemIdx: index('hub_item_tags_item_idx').on(table.itemId),
  tagIdx: index('hub_item_tags_tag_idx').on(table.tagId),
  uniqueItemTag: uniqueIndex('hub_item_tags_unique').on(table.itemId, table.tagId),
}));

// ─── Hub Packs ───────────────────────────────────────────────────────────────
// Sellable bundles — visible on creator's profile when live

export const hubPacks = pgTable('hub_packs', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  title: text('title').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),

  // Pricing & Status
  priceCoins: integer('price_coins').notNull(),
  status: hubPackStatusEnum('status').default('draft').notNull(),

  // Stats (denormalized)
  itemCount: integer('item_count').default(0).notNull(),
  purchaseCount: integer('purchase_count').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('hub_packs_creator_idx').on(table.creatorId),
  creatorStatusIdx: index('hub_packs_creator_status_idx').on(table.creatorId, table.status),
}));

// ─── Hub Pack Items (join) ───────────────────────────────────────────────────

export const hubPackItems = pgTable('hub_pack_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packId: uuid('pack_id').references(() => hubPacks.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => hubItems.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => ({
  packIdx: index('hub_pack_items_pack_idx').on(table.packId),
  uniquePackItem: uniqueIndex('hub_pack_items_unique').on(table.packId, table.itemId),
}));

// ─── Hub Purchases ───────────────────────────────────────────────────────────
// Individual item + pack purchases — ties into existing wallet ledger

export const hubPurchases = pgTable('hub_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // One of these will be set
  itemId: uuid('item_id').references(() => hubItems.id, { onDelete: 'cascade' }),
  packId: uuid('pack_id').references(() => hubPacks.id, { onDelete: 'cascade' }),

  // Transaction
  coinsSpent: integer('coins_spent').notNull(),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),
  idempotencyKey: text('idempotency_key').unique().notNull(),

  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  buyerIdx: index('hub_purchases_buyer_idx').on(table.buyerId),
  creatorIdx: index('hub_purchases_creator_idx').on(table.creatorId),
  itemIdx: index('hub_purchases_item_idx').on(table.itemId),
  packIdx: index('hub_purchases_pack_idx').on(table.packId),
  // User can only purchase the same item/pack once
  uniqueItemPurchase: uniqueIndex('hub_purchases_unique_item').on(table.buyerId, table.itemId),
  uniquePackPurchase: uniqueIndex('hub_purchases_unique_pack').on(table.buyerId, table.packId),
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

export const hubItemsRelations = relations(hubItems, ({ one, many }) => ({
  creator: one(users, {
    fields: [hubItems.creatorId],
    references: [users.id],
  }),
  tags: many(hubItemTags),
  packItems: many(hubPackItems),
  purchases: many(hubPurchases),
}));

export const hubTagsRelations = relations(hubTags, ({ one, many }) => ({
  creator: one(users, {
    fields: [hubTags.creatorId],
    references: [users.id],
  }),
  itemTags: many(hubItemTags),
}));

export const hubItemTagsRelations = relations(hubItemTags, ({ one }) => ({
  item: one(hubItems, {
    fields: [hubItemTags.itemId],
    references: [hubItems.id],
  }),
  tag: one(hubTags, {
    fields: [hubItemTags.tagId],
    references: [hubTags.id],
  }),
}));

export const hubPacksRelations = relations(hubPacks, ({ one, many }) => ({
  creator: one(users, {
    fields: [hubPacks.creatorId],
    references: [users.id],
  }),
  items: many(hubPackItems),
  purchases: many(hubPurchases),
}));

export const hubPackItemsRelations = relations(hubPackItems, ({ one }) => ({
  pack: one(hubPacks, {
    fields: [hubPackItems.packId],
    references: [hubPacks.id],
  }),
  item: one(hubItems, {
    fields: [hubPackItems.itemId],
    references: [hubItems.id],
  }),
}));

export const hubPurchasesRelations = relations(hubPurchases, ({ one }) => ({
  buyer: one(users, {
    fields: [hubPurchases.buyerId],
    references: [users.id],
    relationName: 'hubPurchaseBuyer',
  }),
  creator: one(users, {
    fields: [hubPurchases.creatorId],
    references: [users.id],
    relationName: 'hubPurchaseCreator',
  }),
  item: one(hubItems, {
    fields: [hubPurchases.itemId],
    references: [hubItems.id],
  }),
  pack: one(hubPacks, {
    fields: [hubPurchases.packId],
    references: [hubPacks.id],
  }),
  transaction: one(walletTransactions, {
    fields: [hubPurchases.transactionId],
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

export type HubItem = typeof hubItems.$inferSelect;
export type NewHubItem = typeof hubItems.$inferInsert;
export type HubTag = typeof hubTags.$inferSelect;
export type NewHubTag = typeof hubTags.$inferInsert;
export type HubItemTag = typeof hubItemTags.$inferSelect;
export type NewHubItemTag = typeof hubItemTags.$inferInsert;
export type HubPack = typeof hubPacks.$inferSelect;
export type NewHubPack = typeof hubPacks.$inferInsert;
export type HubPackItem = typeof hubPackItems.$inferSelect;
export type NewHubPackItem = typeof hubPackItems.$inferInsert;
export type HubPurchase = typeof hubPurchases.$inferSelect;
export type NewHubPurchase = typeof hubPurchases.$inferInsert;
export type CreatorPricingDefaults = typeof creatorPricingDefaults.$inferSelect;
export type NewCreatorPricingDefaults = typeof creatorPricingDefaults.$inferInsert;
