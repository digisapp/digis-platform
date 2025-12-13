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

// Menu Items - customizable purchasable items for live streams
// (formerly "Tip Menu" - now supports products, services, and interactions)
export const tipMenuItems = pgTable('tip_menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Item configuration
  label: text('label').notNull(), // e.g., "Song Request", "Ebook", "Virtual Date"
  emoji: text('emoji'), // Optional emoji icon
  price: integer('price').notNull(), // Price in coins
  description: text('description'), // Optional longer description
  thumbnailUrl: text('thumbnail_url'), // Optional item image

  // Item type and fulfillment
  itemCategory: text('item_category').default('interaction').notNull(), // 'interaction', 'product', 'service'
  fulfillmentType: text('fulfillment_type').default('instant').notNull(), // 'instant', 'digital', 'manual'
  digitalContentUrl: text('digital_content_url'), // URL or file for digital products

  // Status and ordering
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('tip_menu_items_creator_id_idx').on(table.creatorId, table.isActive),
  displayOrderIdx: index('tip_menu_items_display_order_idx').on(table.creatorId, table.displayOrder),
}));

// Menu Items Relations
export const tipMenuItemsRelations = relations(tipMenuItems, ({ one, many }) => ({
  creator: one(users, {
    fields: [tipMenuItems.creatorId],
    references: [users.id],
  }),
  purchases: many(menuPurchases),
}));

// Menu Purchases - track purchases from menu items (for fulfillment)
export const menuPurchases = pgTable('menu_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Parties involved
  buyerId: uuid('buyer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menu_item_id').references(() => tipMenuItems.id, { onDelete: 'set null' }),
  streamId: uuid('stream_id'), // Optional - null if purchased outside stream

  // Purchase details (snapshot at time of purchase)
  itemLabel: text('item_label').notNull(),
  itemCategory: text('item_category').notNull(),
  fulfillmentType: text('fulfillment_type').notNull(),
  coinsPaid: integer('coins_paid').notNull(),
  digitalContentUrl: text('digital_content_url'), // Snapshot of URL at purchase time

  // Fulfillment tracking
  status: text('status').default('pending').notNull(), // 'pending', 'fulfilled', 'refunded'
  fulfilledAt: timestamp('fulfilled_at'),
  fulfillmentNote: text('fulfillment_note'), // Creator's note when fulfilling

  // Optional message from buyer
  buyerMessage: text('buyer_message'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('menu_purchases_creator_id_idx').on(table.creatorId, table.status),
  buyerIdIdx: index('menu_purchases_buyer_id_idx').on(table.buyerId),
  streamIdIdx: index('menu_purchases_stream_id_idx').on(table.streamId),
}));

// Menu Purchases Relations
export const menuPurchasesRelations = relations(menuPurchases, ({ one }) => ({
  buyer: one(users, {
    fields: [menuPurchases.buyerId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [menuPurchases.creatorId],
    references: [users.id],
  }),
  menuItem: one(tipMenuItems, {
    fields: [menuPurchases.menuItemId],
    references: [tipMenuItems.id],
  }),
}));
