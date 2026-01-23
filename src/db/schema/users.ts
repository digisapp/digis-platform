import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['fan', 'creator', 'admin']);
export const spendTierEnum = pgEnum('spend_tier', ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'banned']);
export const verificationStatusEnum = pgEnum('verification_status', ['none', 'grandfathered', 'pending', 'verified', 'failed']);

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
  verificationStatus: verificationStatusEnum('verification_status').default('none').notNull(), // Age/ID verification status
  isHiddenFromDiscovery: boolean('is_hidden_from_discovery').default(false).notNull(), // Hide from explore, search, suggestions
  isTrending: boolean('is_trending').default(false),
  isOnline: boolean('is_online').default(false),
  lastSeenAt: timestamp('last_seen_at'),
  usernameLastChangedAt: timestamp('username_last_changed_at'), // Track username changes
  usernameChangeCount: integer('username_change_count').default(0), // Number of changes in current 30-day period
  followerCount: integer('follower_count').default(0).notNull(),
  followingCount: integer('following_count').default(0).notNull(),

  // Lifetime spending tiers (global platform reputation)
  lifetimeSpending: integer('lifetime_spending').default(0).notNull(), // Total coins spent across platform
  spendTier: spendTierEnum('spend_tier').default('none').notNull(), // Calculated tier based on lifetime spending

  // Stripe integration
  stripeCustomerId: text('stripe_customer_id').unique(), // For saved payment methods

  // Storage tracking (in bytes)
  storageUsed: integer('storage_used').default(0).notNull(), // Total storage used by creator

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
  // Social Media Links
  twitterHandle: text('twitter_handle'),
  instagramHandle: text('instagram_handle'),
  tiktokHandle: text('tiktok_handle'),
  snapchatHandle: text('snapchat_handle'),
  youtubeHandle: text('youtube_handle'),
  twitchHandle: text('twitch_handle'),
  amazonHandle: text('amazon_handle'), // Amazon wishlist URL
  contactEmail: text('contact_email'), // Business/contact email
  showSocialLinks: boolean('show_social_links').default(true), // Toggle to show/hide on public profile
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Global user blocks - blocks a user from ALL interactions with the blocker
export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerId: uuid('blocker_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  blockedId: uuid('blocked_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Ensure a user can only block another user once
  uniqueBlock: uniqueIndex('user_blocks_unique_idx').on(table.blockerId, table.blockedId),
  // Fast lookup: "who has this user blocked?"
  blockerIdx: index('user_blocks_blocker_idx').on(table.blockerId),
  // Fast lookup: "is this user blocked by anyone?" (for filtering)
  blockedIdx: index('user_blocks_blocked_idx').on(table.blockedId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type UserBlock = typeof userBlocks.$inferSelect;
export type NewUserBlock = typeof userBlocks.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));
