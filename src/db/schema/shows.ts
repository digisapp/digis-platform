import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { streams } from './streams';
import { walletTransactions } from './wallet';
import { relations } from 'drizzle-orm';

// Show types/categories enum
export const showTypeEnum = pgEnum('show_type', [
  'performance',    // 🎭 Concerts, comedy, theater
  'class',         // 🧘 Yoga, pilates, fitness, dance
  'qna',           // 💬 Q&A, fan interaction, group chat
  'hangout',       // 💕 Private dates, 1-on-1 time, intimate sessions
  'gaming',        // 🎮 Gaming streams, playthroughs
  'workshop',      // 🎓 Tutorials, teaching, how-to
  'other',         // 🎪 Everything else
]);

// Show status enum
export const showStatusEnum = pgEnum('show_status', [
  'scheduled',
  'live',
  'ended',
  'cancelled',
]);

// Shows table
export const shows = pgTable('shows', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Show Details
  title: text('title').notNull(),
  description: text('description'),
  showType: showTypeEnum('show_type').default('other').notNull(),

  // Ticketing
  ticketPrice: integer('ticket_price').notNull(),
  maxTickets: integer('max_tickets'), // NULL = unlimited
  ticketsSold: integer('tickets_sold').default(0).notNull(),

  // Access Control
  isPrivate: boolean('is_private').default(false).notNull(),
  requiresApproval: boolean('requires_approval').default(false).notNull(),

  // Timing
  scheduledStart: timestamp('scheduled_start').notNull(),
  scheduledEnd: timestamp('scheduled_end'),
  actualStart: timestamp('actual_start'),
  actualEnd: timestamp('actual_end'),
  durationMinutes: integer('duration_minutes').default(60).notNull(),

  // LiveKit Integration
  roomName: text('room_name').unique(),
  streamId: uuid('stream_id').references(() => streams.id),

  // Media
  coverImageUrl: text('cover_image_url'),
  trailerUrl: text('trailer_url'),

  // Revenue
  totalRevenue: integer('total_revenue').default(0).notNull(),

  // Status
  status: showStatusEnum('status').default('scheduled').notNull(),

  // Metadata
  tags: text('tags').array(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('idx_shows_creator').on(table.creatorId, table.scheduledStart),
  upcomingIdx: index('idx_shows_upcoming').on(table.status, table.scheduledStart),
  liveIdx: index('idx_shows_live').on(table.status),
}));

// Show tickets table
export const showTickets = pgTable('show_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').references(() => shows.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Purchase
  ticketNumber: integer('ticket_number'),
  coinsPaid: integer('coins_paid').notNull(),
  transactionId: uuid('transaction_id').references(() => walletTransactions.id),

  // Status
  isValid: boolean('is_valid').default(true).notNull(),
  checkInTime: timestamp('check_in_time'),

  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
}, (table) => ({
  showIdx: index('idx_tickets_show').on(table.showId),
  userIdx: index('idx_tickets_user').on(table.userId, table.purchasedAt),
  checkInIdx: index('idx_tickets_checkin').on(table.showId, table.checkInTime),
}));

// Show reminders table
export const showReminders = pgTable('show_reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').references(() => shows.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Reminder Settings
  remindBeforeMinutes: integer('remind_before_minutes').default(15).notNull(),
  remindedAt: timestamp('reminded_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const showsRelations = relations(shows, ({ one, many }) => ({
  creator: one(users, {
    fields: [shows.creatorId],
    references: [users.id],
  }),
  stream: one(streams, {
    fields: [shows.streamId],
    references: [streams.id],
  }),
  tickets: many(showTickets),
  reminders: many(showReminders),
}));

export const showTicketsRelations = relations(showTickets, ({ one }) => ({
  show: one(shows, {
    fields: [showTickets.showId],
    references: [shows.id],
  }),
  user: one(users, {
    fields: [showTickets.userId],
    references: [users.id],
  }),
  transaction: one(walletTransactions, {
    fields: [showTickets.transactionId],
    references: [walletTransactions.id],
  }),
}));

export const showRemindersRelations = relations(showReminders, ({ one }) => ({
  show: one(shows, {
    fields: [showReminders.showId],
    references: [shows.id],
  }),
  user: one(users, {
    fields: [showReminders.userId],
    references: [users.id],
  }),
}));
