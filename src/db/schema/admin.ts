import { pgTable, uuid, text, timestamp, pgEnum, boolean, index, integer } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected']);

// Creator applications table
export const creatorApplications = pgTable('creator_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  displayName: text('display_name'),
  bio: text('bio'), // Why they want to be a creator
  contentCategory: text('content_category'), // Primary content category (Gaming, Music, etc.)
  instagramHandle: text('instagram_handle'),
  tiktokHandle: text('tiktok_handle'),
  otherSocialLinks: text('other_social_links'), // JSON string of additional links
  followerCount: text('follower_count'), // Self-reported: "1k-10k", "10k-50k", etc.
  ageConfirmed: boolean('age_confirmed').default(false), // User confirmed 18+
  termsAccepted: boolean('terms_accepted').default(false), // User accepted terms
  status: applicationStatusEnum('status').default('pending').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  adminNotes: text('admin_notes'), // Internal notes not shown to user
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('creator_applications_user_idx').on(table.userId),
  statusIdx: index('creator_applications_status_idx').on(table.status),
  createdAtIdx: index('creator_applications_created_at_idx').on(table.createdAt),
}));

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

// Page view tracking for traffic analytics
export const pageViews = pgTable('page_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Page info
  path: text('path').notNull(), // e.g., '/explore', '/username', '/stream/123'
  pageType: text('page_type').notNull(), // 'home', 'explore', 'profile', 'stream', 'settings', 'other'
  // For profile pages, track which creator
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'set null' }),
  creatorUsername: text('creator_username'), // Denormalized for fast queries
  // Visitor info (anonymous tracking)
  visitorId: text('visitor_id'), // Anonymous session ID from cookie
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // If logged in
  // Request metadata
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  country: text('country'), // From IP geolocation if available
  device: text('device'), // 'mobile', 'tablet', 'desktop'
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pathIdx: index('page_views_path_idx').on(table.path),
  pageTypeIdx: index('page_views_page_type_idx').on(table.pageType),
  creatorIdIdx: index('page_views_creator_id_idx').on(table.creatorId),
  createdAtIdx: index('page_views_created_at_idx').on(table.createdAt),
  // Compound indexes for common queries
  pageTypeCreatedIdx: index('page_views_type_created_idx').on(table.pageType, table.createdAt),
  creatorCreatedIdx: index('page_views_creator_created_idx').on(table.creatorId, table.createdAt),
}));

export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;

// Daily aggregated stats for faster dashboard queries
export const dailyTrafficStats = pgTable('daily_traffic_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  // Totals
  totalViews: integer('total_views').default(0).notNull(),
  uniqueVisitors: integer('unique_visitors').default(0).notNull(),
  // By page type
  homeViews: integer('home_views').default(0).notNull(),
  exploreViews: integer('explore_views').default(0).notNull(),
  profileViews: integer('profile_views').default(0).notNull(),
  streamViews: integer('stream_views').default(0).notNull(),
  otherViews: integer('other_views').default(0).notNull(),
  // By device
  mobileViews: integer('mobile_views').default(0).notNull(),
  desktopViews: integer('desktop_views').default(0).notNull(),
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dateIdx: index('daily_traffic_stats_date_idx').on(table.date),
}));

export type DailyTrafficStats = typeof dailyTrafficStats.$inferSelect;
export type NewDailyTrafficStats = typeof dailyTrafficStats.$inferInsert;
