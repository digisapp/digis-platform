import { pgTable, uuid, timestamp, text, boolean, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

// Follow relationship table with indexes for efficient queries
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Index for querying followers of a user (who follows X)
  followingIdx: index('follows_following_id_idx').on(table.followingId),
  // Index for querying who a user follows (X follows who)
  followerIdx: index('follows_follower_id_idx').on(table.followerId),
  // Unique constraint to prevent duplicate follows
  uniqueFollow: uniqueIndex('follows_unique_idx').on(table.followerId, table.followingId),
}));

// Creator categories
export const creatorCategories = pgTable('creator_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'), // emoji or icon name
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Many-to-many relationship between creators and categories
export const creatorCategoryAssignments = pgTable('creator_category_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => creatorCategories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Index for querying categories by creator
  creatorIdx: index('creator_category_assignments_creator_id_idx').on(table.creatorId),
  // Index for querying creators by category (explore page filtering)
  categoryIdx: index('creator_category_assignments_category_id_idx').on(table.categoryId),
  // Unique constraint to prevent duplicate assignments
  uniqueAssignment: uniqueIndex('creator_category_assignments_unique_idx').on(table.creatorId, table.categoryId),
}));

// Relations
export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));

export const creatorCategoriesRelations = relations(creatorCategories, ({ many }) => ({
  assignments: many(creatorCategoryAssignments),
}));

export const creatorCategoryAssignmentsRelations = relations(creatorCategoryAssignments, ({ one }) => ({
  creator: one(users, {
    fields: [creatorCategoryAssignments.creatorId],
    references: [users.id],
  }),
  category: one(creatorCategories, {
    fields: [creatorCategoryAssignments.categoryId],
    references: [creatorCategories.id],
  }),
}));

// User reports - for tracking when creators report fans for bad behavior
export const userReports = pgTable('user_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Creator who reported
  reportedUserId: uuid('reported_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Fan being reported
  reason: text('reason').notNull(), // 'harassment', 'spam', 'inappropriate', 'scam', 'other'
  description: text('description'), // Optional detailed description
  status: text('status').default('pending').notNull(), // 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  reporterIdx: index('user_reports_reporter_id_idx').on(table.reporterId),
  reportedUserIdx: index('user_reports_reported_user_id_idx').on(table.reportedUserId),
  statusIdx: index('user_reports_status_idx').on(table.status),
}));

export const userReportsRelations = relations(userReports, ({ one }) => ({
  reporter: one(users, {
    fields: [userReports.reporterId],
    references: [users.id],
    relationName: 'reportsSubmitted',
  }),
  reportedUser: one(users, {
    fields: [userReports.reportedUserId],
    references: [users.id],
    relationName: 'reportsReceived',
  }),
  reviewer: one(users, {
    fields: [userReports.reviewedBy],
    references: [users.id],
    relationName: 'reportsReviewed',
  }),
}));

export type UserReport = typeof userReports.$inferSelect;
export type NewUserReport = typeof userReports.$inferInsert;

// Add relations to users table (extend existing relations)
export const usersExploreRelations = relations(users, ({ many }) => ({
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'follower' }),
  categoryAssignments: many(creatorCategoryAssignments),
  reportsSubmitted: many(userReports, { relationName: 'reportsSubmitted' }),
  reportsReceived: many(userReports, { relationName: 'reportsReceived' }),
}));
