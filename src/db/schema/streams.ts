import { pgTable, uuid, text, integer, timestamp, pgEnum, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Stream status enum
export const streamStatusEnum = pgEnum('stream_status', ['scheduled', 'live', 'ended']);

// Streams table
export const streams = pgTable('streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: streamStatusEnum('status').default('scheduled').notNull(),

  // LiveKit Integration
  roomName: text('room_name').unique().notNull(),
  streamKey: text('stream_key').unique(),

  // Viewer Tracking
  currentViewers: integer('current_viewers').default(0).notNull(),
  peakViewers: integer('peak_viewers').default(0).notNull(),
  totalViews: integer('total_views').default(0).notNull(),

  // Revenue
  totalGiftsReceived: integer('total_gifts_received').default(0).notNull(), // In coins

  // Timing
  scheduledFor: timestamp('scheduled_for'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),

  // Metadata
  thumbnailUrl: text('thumbnail_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('streams_creator_id_idx').on(table.creatorId),
  statusIdx: index('streams_status_idx').on(table.status),
  startedAtIdx: index('streams_started_at_idx').on(table.startedAt),
}));

// Message type enum
export const messageTypeEnum = pgEnum('message_type', ['chat', 'system', 'gift']);

// Stream messages (chat)
export const streamMessages = pgTable('stream_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  username: text('username').notNull(),
  message: text('message').notNull(),
  messageType: messageTypeEnum('message_type').default('chat').notNull(),

  // For gift messages
  giftId: uuid('gift_id'),
  giftAmount: integer('gift_amount'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_messages_stream_id_idx').on(table.streamId, table.createdAt),
}));

// Gift rarity enum
export const giftRarityEnum = pgEnum('gift_rarity', ['common', 'rare', 'epic', 'legendary']);

// Virtual gifts
export const virtualGifts = pgTable('virtual_gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(), // 🌹, 💎, 🎁, ⭐, 🔥
  coinCost: integer('coin_cost').notNull(),
  animationType: text('animation_type').notNull(), // 'float', 'burst', 'confetti', 'fireworks'
  rarity: giftRarityEnum('rarity').default('common').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Stream gifts (transactions)
export const streamGifts = pgTable('stream_gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  giftId: uuid('gift_id').references(() => virtualGifts.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalCoins: integer('total_coins').notNull(),

  // For leaderboard
  senderUsername: text('sender_username').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_gifts_stream_id_idx').on(table.streamId, table.createdAt),
  senderIdIdx: index('stream_gifts_sender_id_idx').on(table.senderId),
}));

// Stream viewers (active tracking)
export const streamViewers = pgTable('stream_viewers', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  username: text('username').notNull(),

  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_viewers_stream_id_idx').on(table.streamId, table.lastSeenAt),
  uniqueViewer: index('stream_viewers_unique_idx').on(table.streamId, table.userId),
}));

// Relations
export const streamsRelations = relations(streams, ({ one, many }) => ({
  creator: one(users, {
    fields: [streams.creatorId],
    references: [users.id],
  }),
  messages: many(streamMessages),
  gifts: many(streamGifts),
  viewers: many(streamViewers),
}));

export const streamMessagesRelations = relations(streamMessages, ({ one }) => ({
  stream: one(streams, {
    fields: [streamMessages.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamMessages.userId],
    references: [users.id],
  }),
}));

export const streamGiftsRelations = relations(streamGifts, ({ one }) => ({
  stream: one(streams, {
    fields: [streamGifts.streamId],
    references: [streams.id],
  }),
  sender: one(users, {
    fields: [streamGifts.senderId],
    references: [users.id],
  }),
  gift: one(virtualGifts, {
    fields: [streamGifts.giftId],
    references: [virtualGifts.id],
  }),
}));

export const streamViewersRelations = relations(streamViewers, ({ one }) => ({
  stream: one(streams, {
    fields: [streamViewers.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamViewers.userId],
    references: [users.id],
  }),
}));

// Type exports
export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
export type StreamMessage = typeof streamMessages.$inferSelect;
export type NewStreamMessage = typeof streamMessages.$inferInsert;
export type VirtualGift = typeof virtualGifts.$inferSelect;
export type NewVirtualGift = typeof virtualGifts.$inferInsert;
export type StreamGift = typeof streamGifts.$inferSelect;
export type NewStreamGift = typeof streamGifts.$inferInsert;
export type StreamViewer = typeof streamViewers.$inferSelect;
export type NewStreamViewer = typeof streamViewers.$inferInsert;
