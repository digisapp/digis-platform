import { pgTable, uuid, text, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Message request status enum
export const messageRequestStatusEnum = pgEnum('message_request_status', ['pending', 'accepted', 'declined']);

// Conversations table (1-on-1 chats)
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Participants (always 2 users)
  user1Id: uuid('user1_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  user2Id: uuid('user2_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Last message info (for inbox preview)
  lastMessageText: text('last_message_text'),
  lastMessageAt: timestamp('last_message_at'),
  lastMessageSenderId: uuid('last_message_sender_id').references(() => users.id),

  // Unread counts (per user)
  user1UnreadCount: text('user1_unread_count').default('0').notNull(),
  user2UnreadCount: text('user2_unread_count').default('0').notNull(),

  // Archive/pin status (per user)
  user1Archived: boolean('user1_archived').default(false).notNull(),
  user2Archived: boolean('user2_archived').default(false).notNull(),
  user1Pinned: boolean('user1_pinned').default(false).notNull(),
  user2Pinned: boolean('user2_pinned').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  user1Idx: index('conversations_user1_id_idx').on(table.user1Id),
  user2Idx: index('conversations_user2_id_idx').on(table.user2Id),
  lastMessageIdx: index('conversations_last_message_at_idx').on(table.lastMessageAt),
  // Ensure unique conversation between two users
  uniqueConversation: index('conversations_unique_idx').on(table.user1Id, table.user2Id),
}));

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Message content
  content: text('content').notNull(),

  // Read status
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at'),

  // Optional: Media attachment
  mediaUrl: text('media_url'),
  mediaType: text('media_type'), // 'image', 'video', etc.

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index('messages_conversation_id_idx').on(table.conversationId, table.createdAt),
  senderIdx: index('messages_sender_id_idx').on(table.senderId),
}));

// Message Requests table
export const messageRequests = pgTable('message_requests', {
  id: uuid('id').primaryKey().defaultRandom(),

  // From fan to creator
  fromUserId: uuid('from_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Initial message
  initialMessage: text('initial_message').notNull(),

  // Status
  status: messageRequestStatusEnum('status').default('pending').notNull(),

  // If accepted, link to conversation
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),

  // Payment (optional - paid requests bypass approval)
  isPaid: boolean('is_paid').default(false).notNull(),
  paidAmount: text('paid_amount').default('0'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
}, (table) => ({
  fromUserIdx: index('message_requests_from_user_id_idx').on(table.fromUserId),
  toUserIdx: index('message_requests_to_user_id_idx').on(table.toUserId, table.status),
}));

// Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user1: one(users, {
    fields: [conversations.user1Id],
    references: [users.id],
    relationName: 'user1',
  }),
  user2: one(users, {
    fields: [conversations.user2Id],
    references: [users.id],
    relationName: 'user2',
  }),
  lastMessageSender: one(users, {
    fields: [conversations.lastMessageSenderId],
    references: [users.id],
    relationName: 'lastMessageSender',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const messageRequestsRelations = relations(messageRequests, ({ one }) => ({
  fromUser: one(users, {
    fields: [messageRequests.fromUserId],
    references: [users.id],
    relationName: 'fromUser',
  }),
  toUser: one(users, {
    fields: [messageRequests.toUserId],
    references: [users.id],
    relationName: 'toUser',
  }),
  conversation: one(conversations, {
    fields: [messageRequests.conversationId],
    references: [conversations.id],
  }),
}));

// Type exports
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageRequest = typeof messageRequests.$inferSelect;
export type NewMessageRequest = typeof messageRequests.$inferInsert;
