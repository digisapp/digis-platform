import { pgTable, uuid, text, integer, boolean, timestamp, date, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { calls, callTypeEnum } from './calls';
import { walletTransactions } from './wallet';

export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]);

// Creator weekly availability (recurring schedule)
export const creatorAvailability = pgTable('creator_availability', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday
  startTime: text('start_time').notNull(), // "HH:MM" 24h format
  endTime: text('end_time').notNull(), // "HH:MM" 24h format
  slotDurationMinutes: integer('slot_duration_minutes').default(30).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  timezone: text('timezone').default('America/New_York').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorActiveIdx: index('creator_availability_creator_active_idx').on(table.creatorId, table.isActive),
  uniqueDay: uniqueIndex('creator_availability_unique_day').on(table.creatorId, table.dayOfWeek),
}));

// Date-specific overrides (block days or custom hours)
export const availabilityOverrides = pgTable('availability_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  isBlocked: boolean('is_blocked').default(true).notNull(), // true = day off
  customStartTime: text('custom_start_time'), // override start (if not blocked)
  customEndTime: text('custom_end_time'), // override end (if not blocked)
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  creatorDateIdx: index('availability_overrides_creator_date_idx').on(table.creatorId, table.date),
  uniqueOverride: uniqueIndex('availability_overrides_unique').on(table.creatorId, table.date),
}));

// Bookings - scheduled call sessions
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fanId: uuid('fan_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Call details
  callType: callTypeEnum('call_type').default('video').notNull(),
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end').notNull(),

  // Status
  status: bookingStatusEnum('status').default('confirmed').notNull(),

  // Payment
  coinsCharged: integer('coins_charged').notNull(),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),

  // Linked call (created when session starts)
  callId: uuid('call_id').references(() => calls.id, { onDelete: 'set null' }),

  // Cancellation
  cancelledBy: uuid('cancelled_by'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  refundAmount: integer('refund_amount'),
  refundTransactionId: uuid('refund_transaction_id').references(() => walletTransactions.id),

  // Fan note
  notes: text('notes'),

  // Reminder
  reminderSentAt: timestamp('reminder_sent_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorScheduleIdx: index('bookings_creator_schedule_idx').on(table.creatorId, table.scheduledStart),
  fanScheduleIdx: index('bookings_fan_schedule_idx').on(table.fanId, table.scheduledStart),
  statusScheduleIdx: index('bookings_status_schedule_idx').on(table.status, table.scheduledStart),
}));

// Relations
export const creatorAvailabilityRelations = relations(creatorAvailability, ({ one }) => ({
  creator: one(users, {
    fields: [creatorAvailability.creatorId],
    references: [users.id],
  }),
}));

export const availabilityOverridesRelations = relations(availabilityOverrides, ({ one }) => ({
  creator: one(users, {
    fields: [availabilityOverrides.creatorId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  creator: one(users, {
    fields: [bookings.creatorId],
    references: [users.id],
    relationName: 'bookingCreator',
  }),
  fan: one(users, {
    fields: [bookings.fanId],
    references: [users.id],
    relationName: 'bookingFan',
  }),
  call: one(calls, {
    fields: [bookings.callId],
    references: [calls.id],
  }),
  transaction: one(walletTransactions, {
    fields: [bookings.transactionId],
    references: [walletTransactions.id],
    relationName: 'bookingTransaction',
  }),
  refundTransaction: one(walletTransactions, {
    fields: [bookings.refundTransactionId],
    references: [walletTransactions.id],
    relationName: 'bookingRefundTransaction',
  }),
}));

// Type exports
export type CreatorAvailability = typeof creatorAvailability.$inferSelect;
export type NewCreatorAvailability = typeof creatorAvailability.$inferInsert;
export type AvailabilityOverride = typeof availabilityOverrides.$inferSelect;
export type NewAvailabilityOverride = typeof availabilityOverrides.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
