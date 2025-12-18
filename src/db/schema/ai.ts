import { pgTable, uuid, timestamp, integer, text, pgEnum, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

// Voice options from xAI Grok Voice Agent API
export const aiVoiceEnum = pgEnum('ai_voice', [
  'ara',    // Female - Warm, friendly (default)
  'eve',    // Female - Energetic, upbeat
  'leo',    // Male - Authoritative, strong
  'rex',    // Male - Confident, clear
  'sal'     // Neutral - Smooth, balanced
]);

export const aiSessionStatusEnum = pgEnum('ai_session_status', [
  'active',      // Session in progress
  'completed',   // Session ended normally
  'failed',      // Session failed (error)
  'cancelled'    // User cancelled
]);

// Creator's AI Twin settings
export const aiTwinSettings = pgTable('ai_twin_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  // Voice Chat Enable/disable
  enabled: boolean('enabled').default(false).notNull(),

  // Text Chat Enable/disable
  textChatEnabled: boolean('text_chat_enabled').default(false).notNull(),

  // Voice and personality (shared between voice & text)
  voice: aiVoiceEnum('voice').default('ara').notNull(),
  personalityPrompt: text('personality_prompt'), // Creator writes their AI's personality
  welcomeMessage: text('welcome_message'), // First message AI says
  boundaryPrompt: text('boundary_prompt'), // Things AI won't discuss

  // Voice Pricing
  pricePerMinute: integer('price_per_minute').default(20).notNull(), // Coins per minute for voice
  minimumMinutes: integer('minimum_minutes').default(5).notNull(), // Minimum session length
  maxSessionMinutes: integer('max_session_minutes').default(60).notNull(), // Maximum session length

  // Text Chat Pricing
  textPricePerMessage: integer('text_price_per_message').default(5).notNull(), // Coins per AI text response

  // Voice Stats (denormalized for quick access)
  totalSessions: integer('total_sessions').default(0).notNull(),
  totalMinutes: integer('total_minutes').default(0).notNull(),
  totalEarnings: integer('total_earnings').default(0).notNull(),
  averageRating: integer('average_rating'), // 1-5 stars * 100 for precision

  // Text Chat Stats
  totalTextMessages: integer('total_text_messages').default(0).notNull(),
  totalTextEarnings: integer('total_text_earnings').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('ai_twin_settings_creator_id_idx').on(table.creatorId),
  enabledIdx: index('ai_twin_settings_enabled_idx').on(table.enabled),
}));

// AI chat sessions between fans and AI Twins
export const aiSessions = pgTable('ai_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Participants
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fanId: uuid('fan_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Session details
  status: aiSessionStatusEnum('status').default('active').notNull(),
  voice: aiVoiceEnum('voice').notNull(), // Voice used for this session

  // Timing
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'), // Actual duration
  lastBilledAt: timestamp('last_billed_at'), // For incremental billing

  // Billing
  pricePerMinute: integer('price_per_minute').notNull(), // Rate at time of session
  minutesBilled: integer('minutes_billed').default(0).notNull(), // Minutes already charged
  coinsSpent: integer('coins_spent').default(0).notNull(), // Total fan paid so far
  creatorEarnings: integer('creator_earnings'), // Creator's cut
  platformFee: integer('platform_fee'), // Platform's cut
  apiCost: integer('api_cost'), // xAI API cost (internal tracking)

  // Quality
  rating: integer('rating'), // 1-5 stars from fan
  ratingComment: text('rating_comment'), // Optional feedback

  // Technical
  sessionToken: text('session_token'), // xAI ephemeral token ID (for debugging)
  errorMessage: text('error_message'), // If session failed

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('ai_sessions_creator_id_idx').on(table.creatorId),
  fanIdIdx: index('ai_sessions_fan_id_idx').on(table.fanId),
  statusIdx: index('ai_sessions_status_idx').on(table.status),
  createdAtIdx: index('ai_sessions_created_at_idx').on(table.createdAt),
  // Compound index for creator analytics
  creatorStatusIdx: index('ai_sessions_creator_status_idx').on(table.creatorId, table.status),
}));

// Relations
export const aiTwinSettingsRelations = relations(aiTwinSettings, ({ one }) => ({
  creator: one(users, {
    fields: [aiTwinSettings.creatorId],
    references: [users.id],
  }),
}));

export const aiSessionsRelations = relations(aiSessions, ({ one }) => ({
  creator: one(users, {
    fields: [aiSessions.creatorId],
    references: [users.id],
    relationName: 'aiSessionCreator',
  }),
  fan: one(users, {
    fields: [aiSessions.fanId],
    references: [users.id],
    relationName: 'aiSessionFan',
  }),
}));

// Types
export type AiTwinSettings = typeof aiTwinSettings.$inferSelect;
export type NewAiTwinSettings = typeof aiTwinSettings.$inferInsert;
export type AiSession = typeof aiSessions.$inferSelect;
export type NewAiSession = typeof aiSessions.$inferInsert;
