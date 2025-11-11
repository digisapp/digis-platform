import { pgTable, uuid, timestamp, text, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

// Notification types
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'message', 'tip', 'follow', 'call', 'stream', 'gift', 'system', 'earnings'
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'), // URL to navigate to when clicked
  isRead: boolean('is_read').default(false).notNull(),
  imageUrl: text('image_url'), // Optional image for the notification
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Add relation to users table
export const usersNotificationsRelations = relations(users, ({ many }) => ({
  notifications: many(notifications),
}));
