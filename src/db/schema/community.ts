import { pgTable, uuid, text, integer, timestamp, index, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const postVisibilityEnum = pgEnum('post_visibility', ['public', 'followers', 'subscribers']);

// ─── Community Posts ─────────────────────────────────────────────────────────
// Creator text/photo posts on their profile — social feed style

export const communityPosts = pgTable('community_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Content
  text: text('text'),                              // Post text (optional if image)
  imageUrl: text('image_url'),                     // Optional image
  imageAspectRatio: text('image_aspect_ratio'),    // e.g. "16:9", "1:1", "4:5"

  // Visibility
  visibility: postVisibilityEnum('visibility').default('public').notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),

  // Engagement (denormalized for perf)
  likeCount: integer('like_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('community_posts_creator_id_idx').on(table.creatorId),
  createdAtIdx: index('community_posts_created_at_idx').on(table.createdAt),
}));

// ─── Post Likes ──────────────────────────────────────────────────────────────

export const postLikes = pgTable('post_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => communityPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  postIdx: index('post_likes_post_id_idx').on(table.postId),
  uniqueLike: index('post_likes_unique_idx').on(table.postId, table.userId),
}));

// ─── Post Comments ───────────────────────────────────────────────────────────

export const postComments = pgTable('post_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => communityPosts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  postIdx: index('post_comments_post_id_idx').on(table.postId),
}));

// ─── Fan Loyalty (per-creator) ───────────────────────────────────────────────
// Tracks how much each fan has spent on a specific creator

export const fanCreatorSpend = pgTable('fan_creator_spend', {
  id: uuid('id').primaryKey().defaultRandom(),
  fanId: uuid('fan_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  totalSpent: integer('total_spent').default(0).notNull(),       // Coins spent on this creator
  tier: text('tier').default('none').notNull(),                  // none, bronze, silver, gold, platinum, diamond
  lastTransactionAt: timestamp('last_transaction_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  fanCreatorIdx: index('fan_creator_spend_unique_idx').on(table.fanId, table.creatorId),
  creatorIdx: index('fan_creator_spend_creator_idx').on(table.creatorId),
  tierIdx: index('fan_creator_spend_tier_idx').on(table.creatorId, table.tier),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  creator: one(users, { fields: [communityPosts.creatorId], references: [users.id] }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(communityPosts, { fields: [postLikes.postId], references: [communityPosts.id] }),
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(communityPosts, { fields: [postComments.postId], references: [communityPosts.id] }),
  user: one(users, { fields: [postComments.userId], references: [users.id] }),
}));

export const fanCreatorSpendRelations = relations(fanCreatorSpend, ({ one }) => ({
  fan: one(users, { fields: [fanCreatorSpend.fanId], references: [users.id] }),
  creator: one(users, { fields: [fanCreatorSpend.creatorId], references: [users.id] }),
}));
