import { pgTable, uuid, timestamp, text, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

// Follow relationship table
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
});

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

// Add relations to users table (extend existing relations)
export const usersExploreRelations = relations(users, ({ many }) => ({
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'follower' }),
  categoryAssignments: many(creatorCategoryAssignments),
}));
