import { pgTable, uuid, text, timestamp, pgEnum, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected']);

// Creator applications table
export const creatorApplications = pgTable('creator_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio'), // Optional - creators fill this out after approval in settings
  category: text('category'), // Primary content category (Gaming, Music, etc.) - optional, set in settings after approval
  instagramHandle: text('instagram_handle'),
  tiktokHandle: text('tiktok_handle'),
  ageConfirmed: boolean('age_confirmed').default(false).notNull(), // User confirmed 18+
  termsAccepted: boolean('terms_accepted').default(false).notNull(), // User accepted terms
  status: applicationStatusEnum('status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const creatorApplicationsRelations = relations(creatorApplications, ({ one }) => ({
  user: one(users, {
    fields: [creatorApplications.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [creatorApplications.reviewedBy],
    references: [users.id],
  }),
}));

export type CreatorApplication = typeof creatorApplications.$inferSelect;
export type NewCreatorApplication = typeof creatorApplications.$inferInsert;

// User login/activity tracking
export const userActivityLogs = pgTable('user_activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  activityType: text('activity_type').notNull(), // 'login', 'stream_start', 'content_upload', 'payout_request'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'), // JSON for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_activity_logs_user_id_idx').on(table.userId),
  activityTypeIdx: index('user_activity_logs_type_idx').on(table.activityType),
  createdAtIdx: index('user_activity_logs_created_at_idx').on(table.createdAt),
  // Compound index for user + activity type queries
  userActivityIdx: index('user_activity_logs_user_activity_idx').on(table.userId, table.activityType, table.createdAt),
}));

export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type NewUserActivityLog = typeof userActivityLogs.$inferInsert;
