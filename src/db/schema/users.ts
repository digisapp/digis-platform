import { pgTable, uuid, text, timestamp, boolean, pgEnum, integer } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['fan', 'creator', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Supabase auth user ID
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'), // Cover/banner image
  bio: text('bio'),
  role: userRoleEnum('role').default('fan').notNull(),
  isCreatorVerified: boolean('is_creator_verified').default(false),
  isOnline: boolean('is_online').default(false),
  lastSeenAt: timestamp('last_seen_at'),
  usernameLastChangedAt: timestamp('username_last_changed_at'), // Track username changes (30-day limit)
  followerCount: integer('follower_count').default(0).notNull(),
  followingCount: integer('following_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  phoneNumber: text('phone_number'),
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
