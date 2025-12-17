import { pgTable, uuid, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { vods } from './vods';
import { streams } from './streams';

// Clips - Short 30-second highlights from streams/VODs (FREE promotional content)
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  vodId: uuid('vod_id').references(() => vods.id, { onDelete: 'set null' }), // Source VOD (if clipped from VOD)
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'set null' }), // Original stream

  // Metadata
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),

  // Video details
  videoUrl: text('video_url'), // URL to clip video file
  duration: integer('duration').default(30).notNull(), // Duration in seconds (default 30s)

  // Source timing (for clipping from VOD)
  startTime: integer('start_time').default(0).notNull(), // Start position in source VOD (seconds)

  // Visibility
  isPublic: boolean('is_public').default(true).notNull(), // Clips are public/free by default

  // Stats
  viewCount: integer('view_count').default(0).notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  shareCount: integer('share_count').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for creator's clips list
  creatorIdx: index('clips_creator_id_idx').on(table.creatorId),
  // Compound index for creator's clips sorted by date
  creatorCreatedIdx: index('clips_creator_created_idx').on(table.creatorId, table.createdAt),
  // Index for VOD's clips
  vodIdx: index('clips_vod_id_idx').on(table.vodId),
  // Index for popular clips
  viewCountIdx: index('clips_view_count_idx').on(table.viewCount),
}));

// Clip views - track who watched
export const clipViews = pgTable('clip_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id').references(() => clips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
}, (table) => ({
  clipIdx: index('clip_views_clip_id_idx').on(table.clipId),
  userIdx: index('clip_views_user_id_idx').on(table.userId),
}));

// Clip likes
export const clipLikes = pgTable('clip_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  clipId: uuid('clip_id').references(() => clips.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  clipIdx: index('clip_likes_clip_id_idx').on(table.clipId),
  userIdx: index('clip_likes_user_id_idx').on(table.userId),
  // Unique constraint to prevent duplicate likes
  uniqueLike: index('clip_likes_unique_idx').on(table.clipId, table.userId),
}));

// Relations
export const clipsRelations = relations(clips, ({ one, many }) => ({
  creator: one(users, {
    fields: [clips.creatorId],
    references: [users.id],
  }),
  vod: one(vods, {
    fields: [clips.vodId],
    references: [vods.id],
  }),
  stream: one(streams, {
    fields: [clips.streamId],
    references: [streams.id],
  }),
  views: many(clipViews),
  likes: many(clipLikes),
}));

export const clipViewsRelations = relations(clipViews, ({ one }) => ({
  clip: one(clips, {
    fields: [clipViews.clipId],
    references: [clips.id],
  }),
  user: one(users, {
    fields: [clipViews.userId],
    references: [users.id],
  }),
}));

export const clipLikesRelations = relations(clipLikes, ({ one }) => ({
  clip: one(clips, {
    fields: [clipLikes.clipId],
    references: [clips.id],
  }),
  user: one(users, {
    fields: [clipLikes.userId],
    references: [users.id],
  }),
}));

// Type exports
export type Clip = typeof clips.$inferSelect;
export type NewClip = typeof clips.$inferInsert;
export type ClipView = typeof clipViews.$inferSelect;
export type NewClipView = typeof clipViews.$inferInsert;
export type ClipLike = typeof clipLikes.$inferSelect;
export type NewClipLike = typeof clipLikes.$inferInsert;
