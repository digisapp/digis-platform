import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['fan', 'creator', 'admin']);
export const spendTierEnum = pgEnum('spend_tier', ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'banned']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Supabase auth user ID
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'), // Cover/banner image
  creatorCardImageUrl: text('creator_card_image_url'), // 16:9 image for creator cards on explore page
  bio: text('bio'),
  role: userRoleEnum('role').default('fan').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(), // Separate admin flag - user can be creator AND admin
  accountStatus: accountStatusEnum('account_status').default('active').notNull(),

  // Creator categories (for content discovery)
  primaryCategory: text('primary_category'), // Main category e.g., "Gaming", "Music"
  secondaryCategory: text('secondary_category'), // Optional second category
  isCreatorVerified: boolean('is_creator_verified').default(false),
  isTrending: boolean('is_trending').default(false),
  isOnline: boolean('is_online').default(false),
  lastSeenAt: timestamp('last_seen_at'),
  usernameLastChangedAt: timestamp('username_last_changed_at'), // Track username changes (60-day cooldown)
  followerCount: integer('follower_count').default(0).notNull(),
  followingCount: integer('following_count').default(0).notNull(),

  // Lifetime spending tiers (global platform reputation)
  lifetimeSpending: integer('lifetime_spending').default(0).notNull(), // Total coins spent across platform
  spendTier: spendTierEnum('spend_tier').default('none').notNull(), // Calculated tier based on lifetime spending

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  phoneNumber: text('phone_number'),
  city: text('city'),
  state: text('state'),
  location: text('location'),
  website: text('website'),
  twitterHandle: text('twitter_handle'),
  instagramHandle: text('instagram_handle'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));
