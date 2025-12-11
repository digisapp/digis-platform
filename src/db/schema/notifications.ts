import { pgTable, uuid, timestamp, text, boolean, index } from 'drizzle-orm/pg-core';
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
}, (table) => ({
  // Index for fetching user's notifications
  userIdx: index('notifications_user_id_idx').on(table.userId),
  // Compound index for user's notifications sorted by date (most common query)
  userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
  // Index for unread count queries
  userUnreadIdx: index('notifications_user_unread_idx').on(table.userId, table.isRead),
}));

// Push notification subscriptions for Web Push API
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(), // Push service endpoint URL
  p256dh: text('p256dh').notNull(), // Public key for encryption
  auth: text('auth').notNull(), // Auth secret
  userAgent: text('user_agent'), // Browser/device info
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
}, (table) => ({
  userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  endpointIdx: index('push_subscriptions_endpoint_idx').on(table.endpoint),
}));

// Notification preferences per user
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  // Push notification toggles
  pushEnabled: boolean('push_enabled').default(true).notNull(),
  pushMessages: boolean('push_messages').default(true).notNull(),
  pushCalls: boolean('push_calls').default(true).notNull(),
  pushStreams: boolean('push_streams').default(true).notNull(),
  pushTips: boolean('push_tips').default(true).notNull(),
  pushFollows: boolean('push_follows').default(true).notNull(),
  // Email notification toggles
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  emailDigest: text('email_digest').default('daily'), // 'none', 'instant', 'daily', 'weekly'
  // Quiet hours
  quietHoursEnabled: boolean('quiet_hours_enabled').default(false).notNull(),
  quietHoursStart: text('quiet_hours_start').default('22:00'), // HH:mm format
  quietHoursEnd: text('quiet_hours_end').default('08:00'),
  timezone: text('timezone').default('UTC'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// Add relation to users table
export const usersNotificationsRelations = relations(users, ({ many, one }) => ({
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
  notificationPreferences: one(notificationPreferences),
}));
