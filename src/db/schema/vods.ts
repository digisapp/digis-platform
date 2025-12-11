import { pgTable, uuid, text, integer, timestamp, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { streams } from './streams';

// VOD (Video on Demand) - Saved stream recordings
export const vods = pgTable('vods', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Metadata
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),

  // Video details
  videoUrl: text('video_url'), // URL to stored video file (S3, Cloudflare Stream, etc.)
  duration: integer('duration'), // Duration in seconds

  // Access control
  isPublic: boolean('is_public').default(false).notNull(), // Free for everyone
  priceCoins: integer('price_coins').default(0).notNull(), // PPV price (0 = free for subscribers)
  subscribersOnly: boolean('subscribers_only').default(false).notNull(), // Only subscribers can watch

  // Stats
  viewCount: integer('view_count').default(0).notNull(),
  purchaseCount: integer('purchase_count').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(), // Total coins earned from PPV

  // Original stream stats (copied from stream)
  originalViewers: integer('original_viewers').default(0).notNull(),
  originalPeakViewers: integer('original_peak_viewers').default(0).notNull(),
  originalEarnings: integer('original_earnings').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for creator's VODs list
  creatorIdx: index('vods_creator_id_idx').on(table.creatorId),
  // Compound index for creator's VODs sorted by date
  creatorCreatedIdx: index('vods_creator_created_idx').on(table.creatorId, table.createdAt),
}));

// VOD purchases - track who bought access
export const vodPurchases = pgTable('vod_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  vodId: uuid('vod_id').references(() => vods.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  priceCoins: integer('price_coins').notNull(), // Price paid at time of purchase

  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  // Index for VOD's purchase history
  vodIdx: index('vod_purchases_vod_id_idx').on(table.vodId),
  // Index for user's purchase history
  userIdx: index('vod_purchases_user_id_idx').on(table.userId),
  // Unique constraint to prevent duplicate purchases
  uniquePurchase: uniqueIndex('vod_purchases_unique_idx').on(table.vodId, table.userId),
}));

// VOD views - track watch history
export const vodViews = pgTable('vod_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  vodId: uuid('vod_id').references(() => vods.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

  // Watch progress
  watchedDuration: integer('watched_duration').default(0).notNull(), // Seconds watched
  lastPosition: integer('last_position').default(0).notNull(), // Last playback position
  completed: boolean('completed').default(false).notNull(), // Watched 90%+

  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for VOD's view analytics
  vodIdx: index('vod_views_vod_id_idx').on(table.vodId),
  // Index for user's watch history
  userIdx: index('vod_views_user_id_idx').on(table.userId),
  // Index for completion analytics
  completedIdx: index('vod_views_completed_idx').on(table.completed),
}));

// Relations
export const vodsRelations = relations(vods, ({ one, many }) => ({
  stream: one(streams, {
    fields: [vods.streamId],
    references: [streams.id],
  }),
  creator: one(users, {
    fields: [vods.creatorId],
    references: [users.id],
  }),
  purchases: many(vodPurchases),
  views: many(vodViews),
}));

export const vodPurchasesRelations = relations(vodPurchases, ({ one }) => ({
  vod: one(vods, {
    fields: [vodPurchases.vodId],
    references: [vods.id],
  }),
  user: one(users, {
    fields: [vodPurchases.userId],
    references: [users.id],
  }),
}));

export const vodViewsRelations = relations(vodViews, ({ one }) => ({
  vod: one(vods, {
    fields: [vodViews.vodId],
    references: [vods.id],
  }),
  user: one(users, {
    fields: [vodViews.userId],
    references: [users.id],
  }),
}));

// Type exports
export type VOD = typeof vods.$inferSelect;
export type NewVOD = typeof vods.$inferInsert;
export type VODPurchase = typeof vodPurchases.$inferSelect;
export type NewVODPurchase = typeof vodPurchases.$inferInsert;
export type VODView = typeof vodViews.$inferSelect;
export type NewVODView = typeof vodViews.$inferInsert;
