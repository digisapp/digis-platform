import { pgTable, text, timestamp, integer, boolean, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Social platform types
export const socialPlatformEnum = pgEnum('social_platform', [
  'instagram_story',
  'instagram_bio',
  'tiktok_bio',
]);

// Submission status
export const shareSubmissionStatusEnum = pgEnum('share_submission_status', [
  'pending',
  'approved',
  'rejected',
]);

// Social share submissions - creators submit proof of sharing
export const socialShareSubmissions = pgTable('social_share_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: socialPlatformEnum('platform').notNull(),
  screenshotUrl: text('screenshot_url').notNull(), // Uploaded proof image
  socialHandle: text('social_handle'), // Their IG/TikTok username
  status: shareSubmissionStatusEnum('status').notNull().default('pending'),
  coinsAwarded: integer('coins_awarded').default(0),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Reward configuration - defines how many coins each action gives
export const rewardConfig = pgTable('reward_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rewardType: text('reward_type').notNull().unique(), // e.g., 'instagram_story', 'instagram_bio', 'tiktok_bio'
  coinsAmount: integer('coins_amount').notNull().default(100),
  isActive: boolean('is_active').notNull().default(true),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const socialShareSubmissionsRelations = relations(socialShareSubmissions, ({ one }) => ({
  creator: one(users, {
    fields: [socialShareSubmissions.creatorId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [socialShareSubmissions.reviewedBy],
    references: [users.id],
  }),
}));
