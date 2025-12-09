import { pgTable, uuid, timestamp, integer, text, pgEnum, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const callStatusEnum = pgEnum('call_status', [
  'pending',      // Call requested, waiting for creator to accept
  'accepted',     // Creator accepted, waiting to start
  'active',       // Call in progress
  'completed',    // Call ended successfully
  'cancelled',    // Cancelled before starting
  'rejected',     // Creator rejected the request
  'missed'        // Creator didn't respond in time
]);

export const callTypeEnum = pgEnum('call_type', [
  'video',        // Video call
  'voice'         // Voice-only call
]);

export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Participants
  fanId: uuid('fan_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Call details
  callType: callTypeEnum('call_type').default('video').notNull(),
  status: callStatusEnum('status').default('pending').notNull(),
  ratePerMinute: integer('rate_per_minute').notNull(), // Coins per minute

  // Timing
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),

  // Duration and billing
  durationSeconds: integer('duration_seconds'), // Actual call duration
  estimatedCoins: integer('estimated_coins'), // Initial hold amount
  actualCoins: integer('actual_coins'), // Final charge amount

  // LiveKit
  roomName: text('room_name').unique(),

  // Hold tracking
  holdId: uuid('hold_id'), // References spend_holds.id

  // Cancellation/rejection
  cancelledBy: uuid('cancelled_by'), // user_id who cancelled
  cancellationReason: text('cancellation_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  fanIdIdx: index('calls_fan_id_idx').on(table.fanId),
  creatorIdIdx: index('calls_creator_id_idx').on(table.creatorId),
  statusIdx: index('calls_status_idx').on(table.status),
  roomNameIdx: index('calls_room_name_idx').on(table.roomName),
  // Compound index for creator analytics queries (creatorId + status)
  creatorStatusIdx: index('calls_creator_status_idx').on(table.creatorId, table.status),
}));

// Creator availability settings
export const creatorSettings = pgTable('creator_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  // Video Call Rates
  callRatePerMinute: integer('call_rate_per_minute').default(50).notNull(), // Default 50 coins/min
  minimumCallDuration: integer('minimum_call_duration').default(5).notNull(), // Min 5 minutes

  // Voice Call Rates
  voiceCallRatePerMinute: integer('voice_call_rate_per_minute').default(25).notNull(), // Default 25 coins/min
  minimumVoiceCallDuration: integer('minimum_voice_call_duration').default(5).notNull(), // Min 5 minutes

  // Message Rates
  messageRate: integer('message_rate').default(50).notNull(), // Default 50 coins per message

  // Availability
  isAvailableForCalls: boolean('is_available_for_calls').default(true).notNull(),
  isAvailableForVoiceCalls: boolean('is_available_for_voice_calls').default(true).notNull(),

  // Auto-accept
  autoAcceptCalls: boolean('auto_accept_calls').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const callsRelations = relations(calls, ({ one }) => ({
  fan: one(users, {
    fields: [calls.fanId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [calls.creatorId],
    references: [users.id],
  }),
}));

export const creatorSettingsRelations = relations(creatorSettings, ({ one }) => ({
  user: one(users, {
    fields: [creatorSettings.userId],
    references: [users.id],
  }),
}));

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type CreatorSettings = typeof creatorSettings.$inferSelect;
export type NewCreatorSettings = typeof creatorSettings.$inferInsert;
