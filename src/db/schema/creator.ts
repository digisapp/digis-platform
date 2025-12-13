import { pgTable, uuid, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Creator profile goals (persistent, not tied to streams)
export const creatorGoals = pgTable('creator_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Goal configuration
  title: text('title').notNull(), // e.g., "1,000 Followers"
  description: text('description'), // Optional description
  goalType: text('goal_type').notNull(), // 'followers', 'coins', 'subscribers'
  targetAmount: integer('target_amount').notNull(), // Number to reach
  currentAmount: integer('current_amount').default(0).notNull(), // Current progress

  // Reward
  rewardText: text('reward_text').notNull(), // e.g., "I'll post exclusive content!"

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),

  // Top tippers tracking
  metadata: text('metadata'), // JSON string for tippers data: { tippers: [{ userId, username, displayName, avatarUrl, totalAmount }] }
  showTopTippers: boolean('show_top_tippers').default(true).notNull(), // Creator toggle for showing top tippers

  // Display order
  displayOrder: integer('display_order').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('creator_goals_creator_id_idx').on(table.creatorId, table.isActive),
  displayOrderIdx: index('creator_goals_display_order_idx').on(table.creatorId, table.displayOrder),
}));

// Relations
export const creatorGoalsRelations = relations(creatorGoals, ({ one }) => ({
  creator: one(users, {
    fields: [creatorGoals.creatorId],
    references: [users.id],
  }),
}));

// Tip Menu Items - customizable tip options for live streams
export const tipMenuItems = pgTable('tip_menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Item configuration
  label: text('label').notNull(), // e.g., "Song Request", "Shoutout"
  emoji: text('emoji'), // Optional emoji icon
  price: integer('price').notNull(), // Price in coins
  description: text('description'), // Optional longer description

  // Status and ordering
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('tip_menu_items_creator_id_idx').on(table.creatorId, table.isActive),
  displayOrderIdx: index('tip_menu_items_display_order_idx').on(table.creatorId, table.displayOrder),
}));

// Tip Menu Relations
export const tipMenuItemsRelations = relations(tipMenuItems, ({ one }) => ({
  creator: one(users, {
    fields: [tipMenuItems.creatorId],
    references: [users.id],
  }),
}));
