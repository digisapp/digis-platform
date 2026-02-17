import { pgTable, uuid, text, integer, boolean, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { spendHolds } from './wallet';

export const groupRoomTypeEnum = pgEnum('group_room_type', [
  'coaching',
  'fitness',
  'hangout',
  'gaming',
  'workshop',
  'other',
]);

export const groupRoomStatusEnum = pgEnum('group_room_status', [
  'scheduled',
  'waiting',
  'active',
  'ended',
  'cancelled',
]);

export const groupRoomPriceTypeEnum = pgEnum('group_room_price_type', [
  'free',
  'flat',
  'per_minute',
]);

export const participantStatusEnum = pgEnum('participant_status', [
  'joined',
  'left',
  'removed',
]);

// Group video rooms - multi-participant sessions
export const groupRooms = pgTable('group_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Details
  title: text('title').notNull(),
  description: text('description'),
  roomType: groupRoomTypeEnum('room_type').default('other').notNull(),

  // Status & LiveKit
  status: groupRoomStatusEnum('status').default('scheduled').notNull(),
  roomName: text('room_name').unique(), // "group-{nanoid}"

  // Capacity
  maxParticipants: integer('max_participants').default(10).notNull(),

  // Pricing
  priceType: groupRoomPriceTypeEnum('price_type').default('free').notNull(),
  priceCoins: integer('price_coins').default(0).notNull(),

  // Scheduling
  scheduledStart: timestamp('scheduled_start'), // nullable for instant rooms
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  durationSeconds: integer('duration_seconds'),

  // Stats (denormalized)
  currentParticipants: integer('current_participants').default(0).notNull(),
  totalParticipants: integer('total_participants').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),

  // Controls
  isLocked: boolean('is_locked').default(false).notNull(),

  // Media
  coverImageUrl: text('cover_image_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorStatusIdx: index('group_rooms_creator_status_idx').on(table.creatorId, table.status),
  upcomingIdx: index('group_rooms_upcoming_idx').on(table.status, table.scheduledStart),
  roomNameIdx: index('group_rooms_room_name_idx').on(table.roomName),
}));

// Participants in group rooms
export const groupRoomParticipants = pgTable('group_room_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => groupRooms.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Status
  status: participantStatusEnum('status').default('joined').notNull(),

  // Timing
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
  durationSeconds: integer('duration_seconds'),

  // Billing
  coinsCharged: integer('coins_charged').default(0).notNull(),
  holdId: uuid('hold_id').references(() => spendHolds.id, { onDelete: 'set null' }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roomStatusIdx: index('group_room_participants_room_status_idx').on(table.roomId, table.status),
  userIdx: index('group_room_participants_user_idx').on(table.userId),
  uniqueParticipant: uniqueIndex('group_room_participants_unique').on(table.roomId, table.userId),
}));

// Relations
export const groupRoomsRelations = relations(groupRooms, ({ one, many }) => ({
  creator: one(users, {
    fields: [groupRooms.creatorId],
    references: [users.id],
  }),
  participants: many(groupRoomParticipants),
}));

export const groupRoomParticipantsRelations = relations(groupRoomParticipants, ({ one }) => ({
  room: one(groupRooms, {
    fields: [groupRoomParticipants.roomId],
    references: [groupRooms.id],
  }),
  user: one(users, {
    fields: [groupRoomParticipants.userId],
    references: [users.id],
  }),
  hold: one(spendHolds, {
    fields: [groupRoomParticipants.holdId],
    references: [spendHolds.id],
  }),
}));

// Type exports
export type GroupRoom = typeof groupRooms.$inferSelect;
export type NewGroupRoom = typeof groupRooms.$inferInsert;
export type GroupRoomParticipant = typeof groupRoomParticipants.$inferSelect;
export type NewGroupRoomParticipant = typeof groupRoomParticipants.$inferInsert;
