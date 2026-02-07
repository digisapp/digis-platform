import { pgTable, uuid, text, integer, timestamp, pgEnum, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Stream status enum
export const streamStatusEnum = pgEnum('stream_status', ['scheduled', 'live', 'ended']);

// Streams table
export const streams = pgTable('streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: streamStatusEnum('status').default('scheduled').notNull(),

  // LiveKit Integration
  roomName: text('room_name').unique().notNull(),
  streamKey: text('stream_key').unique(),

  // Viewer Tracking
  currentViewers: integer('current_viewers').default(0).notNull(),
  peakViewers: integer('peak_viewers').default(0).notNull(),
  totalViews: integer('total_views').default(0).notNull(),

  // Revenue
  totalGiftsReceived: integer('total_gifts_received').default(0).notNull(), // In coins

  // Timing
  scheduledFor: timestamp('scheduled_for'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  durationSeconds: integer('duration_seconds'),
  lastHeartbeat: timestamp('last_heartbeat'), // For detecting disconnected broadcasters

  // Metadata
  thumbnailUrl: text('thumbnail_url'),
  privacy: text('privacy').default('public').notNull(), // public, followers, private
  orientation: text('orientation').default('landscape').notNull(), // landscape, portrait
  tipMenuEnabled: boolean('tip_menu_enabled').default(true).notNull(), // Show tip menu to viewers (enabled by default)

  // Category & Tags (for discoverability)
  category: text('category'), // Main category: "Just Chatting", "Gaming", "Music", etc.
  tags: text('tags').array().default([]), // Array of hashtags like ["cozy", "lofi", "nightstream"]

  // Featured creator commission (0-100, percentage host takes from featured creator tips)
  featuredCreatorCommission: integer('featured_creator_commission').default(0).notNull(),

  // Ticketed streams
  ticketPrice: integer('ticket_price'), // Price in coins (null = not ticketed)
  ticketsSold: integer('tickets_sold').default(0).notNull(),
  ticketRevenue: integer('ticket_revenue').default(0).notNull(), // Total coins from ticket sales

  // VIP Mode (when host activates a ticketed show within this stream)
  activeVipShowId: uuid('active_vip_show_id'), // References shows table - set when VIP mode is active
  vipStartedAt: timestamp('vip_started_at'), // When VIP mode was activated

  // Go Private settings (1-on-1 video calls during stream)
  goPrivateEnabled: boolean('go_private_enabled').default(true).notNull(),
  goPrivateRate: integer('go_private_rate'), // Coins per minute (null = use creator's default call rate)
  goPrivateMinDuration: integer('go_private_min_duration'), // Minutes (null = use creator's default)

  // Recording (LiveKit Egress)
  egressId: text('egress_id'), // LiveKit Egress ID for recording

  // Guest call-in settings
  guestRequestsEnabled: boolean('guest_requests_enabled').default(false).notNull(), // Allow viewers to request to join
  activeGuestId: uuid('active_guest_id'), // Currently active guest user ID (null if no guest)

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index('streams_creator_id_idx').on(table.creatorId),
  statusIdx: index('streams_status_idx').on(table.status),
  startedAtIdx: index('streams_started_at_idx').on(table.startedAt),
  categoryIdx: index('streams_category_idx').on(table.category),
}));

// Message type enum
export const messageTypeEnum = pgEnum('message_type', ['chat', 'system', 'gift', 'tip']);

// Stream messages (chat)
export const streamMessages = pgTable('stream_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  username: text('username').notNull(),
  message: text('message').notNull(),
  messageType: messageTypeEnum('message_type').default('chat').notNull(),

  // For gift messages
  giftId: uuid('gift_id'),
  giftAmount: integer('gift_amount'),

  // For tip menu purchases
  tipMenuItemId: uuid('tip_menu_item_id'),
  tipMenuItemLabel: text('tip_menu_item_label'),

  // AI Chat Moderator
  isAiGenerated: boolean('is_ai_generated').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_messages_stream_id_idx').on(table.streamId, table.createdAt),
}));

// Gift rarity enum
export const giftRarityEnum = pgEnum('gift_rarity', ['common', 'rare', 'epic', 'legendary']);

// Virtual gifts
export const virtualGifts = pgTable('virtual_gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(), // 🌹, 💎, 🎁, ⭐, 🔥
  coinCost: integer('coin_cost').notNull(),
  animationType: text('animation_type').notNull(), // 'float', 'burst', 'confetti', 'fireworks'
  rarity: giftRarityEnum('rarity').default('common').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Stream gifts (transactions)
export const streamGifts = pgTable('stream_gifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  giftId: uuid('gift_id').references(() => virtualGifts.id).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalCoins: integer('total_coins').notNull(),

  // For leaderboard
  senderUsername: text('sender_username').notNull(),

  // Directed tip to featured creator (null = tip goes to stream host)
  recipientCreatorId: uuid('recipient_creator_id').references(() => users.id),
  recipientUsername: text('recipient_username'), // Cached for display

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_gifts_stream_id_idx').on(table.streamId, table.createdAt),
  senderIdIdx: index('stream_gifts_sender_id_idx').on(table.senderId),
  recipientIdIdx: index('stream_gifts_recipient_id_idx').on(table.recipientCreatorId),
}));

// Stream viewers (active tracking)
export const streamViewers = pgTable('stream_viewers', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id),
  username: text('username').notNull(),

  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_viewers_stream_id_idx').on(table.streamId, table.lastSeenAt),
  uniqueViewer: index('stream_viewers_unique_idx').on(table.streamId, table.userId),
}));

// Featured creators in a stream (for collabs, fashion shows, etc.)
export const streamFeaturedCreators = pgTable('stream_featured_creators', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Display info (cached for performance)
  displayName: text('display_name'),
  username: text('username').notNull(),
  avatarUrl: text('avatar_url'),

  // Lineup order (for fashion shows, etc.)
  lineupOrder: integer('lineup_order').default(0).notNull(),

  // Spotlight state (is this creator currently highlighted)
  isSpotlighted: boolean('is_spotlighted').default(false).notNull(),
  spotlightedAt: timestamp('spotlighted_at'),

  // Stats for this creator in this stream
  tipsReceived: integer('tips_received').default(0).notNull(), // Total coins received
  giftCount: integer('gift_count').default(0).notNull(), // Number of gifts

  // Invitation status
  status: text('status').default('pending').notNull(), // pending, accepted, declined
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_featured_creators_stream_id_idx').on(table.streamId),
  creatorIdIdx: index('stream_featured_creators_creator_id_idx').on(table.creatorId),
  uniqueFeatured: index('stream_featured_creators_unique_idx').on(table.streamId, table.creatorId),
}));

// Stream goals (progress bars for viewers to unlock rewards)
export const streamGoals = pgTable('stream_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),

  // Goal configuration
  title: text('title').notNull(), // e.g., "Next Song Request"
  description: text('description'), // Optional description
  goalType: text('goal_type').notNull(), // 'gifts' (specific gift), 'coins' (any gift), 'viewers'
  giftId: uuid('gift_id').references(() => virtualGifts.id), // If goalType is 'gifts'
  targetAmount: integer('target_amount').notNull(), // Number to reach
  currentAmount: integer('current_amount').default(0).notNull(), // Current progress

  // Reward
  rewardText: text('reward_text').notNull(), // e.g., "I'll sing your song!"

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_goals_stream_id_idx').on(table.streamId, table.isActive),
}));

// Stream bans (persisted viewer bans)
export const streamBans = pgTable('stream_bans', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bannedBy: uuid('banned_by').references(() => users.id, { onDelete: 'set null' }), // The creator who banned
  reason: text('reason'), // Optional ban reason
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_bans_stream_id_idx').on(table.streamId),
  userIdIdx: index('stream_bans_user_id_idx').on(table.userId),
  uniqueBan: index('stream_bans_unique_idx').on(table.streamId, table.userId),
}));

// Stream tickets (for paid/ticketed streams)
export const streamTickets = pgTable('stream_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Purchase info
  pricePaid: integer('price_paid').notNull(), // Coins paid at time of purchase
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),

  // Validity (can be invalidated on refund/cancellation)
  isValid: boolean('is_valid').default(true).notNull(),

  // Transaction reference
  transactionId: uuid('transaction_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_tickets_stream_id_idx').on(table.streamId),
  userIdIdx: index('stream_tickets_user_id_idx').on(table.userId),
  uniqueTicket: index('stream_tickets_unique_idx').on(table.streamId, table.userId),
}));

// Relations
export const streamsRelations = relations(streams, ({ one, many }) => ({
  creator: one(users, {
    fields: [streams.creatorId],
    references: [users.id],
  }),
  messages: many(streamMessages),
  gifts: many(streamGifts),
  viewers: many(streamViewers),
  goals: many(streamGoals),
  featuredCreators: many(streamFeaturedCreators),
  tickets: many(streamTickets),
  bans: many(streamBans),
  polls: many(streamPolls),
  countdowns: many(streamCountdowns),
  guestRequests: many(streamGuestRequests),
}));

export const streamMessagesRelations = relations(streamMessages, ({ one }) => ({
  stream: one(streams, {
    fields: [streamMessages.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamMessages.userId],
    references: [users.id],
  }),
}));

export const streamGiftsRelations = relations(streamGifts, ({ one }) => ({
  stream: one(streams, {
    fields: [streamGifts.streamId],
    references: [streams.id],
  }),
  sender: one(users, {
    fields: [streamGifts.senderId],
    references: [users.id],
  }),
  gift: one(virtualGifts, {
    fields: [streamGifts.giftId],
    references: [virtualGifts.id],
  }),
}));

export const streamViewersRelations = relations(streamViewers, ({ one }) => ({
  stream: one(streams, {
    fields: [streamViewers.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamViewers.userId],
    references: [users.id],
  }),
}));

export const streamGoalsRelations = relations(streamGoals, ({ one }) => ({
  stream: one(streams, {
    fields: [streamGoals.streamId],
    references: [streams.id],
  }),
  gift: one(virtualGifts, {
    fields: [streamGoals.giftId],
    references: [virtualGifts.id],
  }),
}));

export const streamFeaturedCreatorsRelations = relations(streamFeaturedCreators, ({ one }) => ({
  stream: one(streams, {
    fields: [streamFeaturedCreators.streamId],
    references: [streams.id],
  }),
  creator: one(users, {
    fields: [streamFeaturedCreators.creatorId],
    references: [users.id],
  }),
}));

export const streamTicketsRelations = relations(streamTickets, ({ one }) => ({
  stream: one(streams, {
    fields: [streamTickets.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamTickets.userId],
    references: [users.id],
  }),
}));

export const streamBansRelations = relations(streamBans, ({ one }) => ({
  stream: one(streams, {
    fields: [streamBans.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamBans.userId],
    references: [users.id],
  }),
  bannedByUser: one(users, {
    fields: [streamBans.bannedBy],
    references: [users.id],
  }),
}));

// Stream polls (engagement feature)
export const streamPolls = pgTable('stream_polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Poll content
  question: text('question').notNull(),
  options: text('options').array().notNull(), // Array of option strings

  // Vote counts per option (indexed by option position)
  voteCounts: integer('vote_counts').array().default([]).notNull(),
  totalVotes: integer('total_votes').default(0).notNull(),

  // Timing
  durationSeconds: integer('duration_seconds').default(60).notNull(), // How long poll runs
  endsAt: timestamp('ends_at').notNull(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_polls_stream_id_idx').on(table.streamId, table.isActive),
}));

// Stream poll votes (track who voted for what)
export const streamPollVotes = pgTable('stream_poll_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  pollId: uuid('poll_id').references(() => streamPolls.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  optionIndex: integer('option_index').notNull(), // Which option they voted for (0-based)

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pollIdIdx: index('stream_poll_votes_poll_id_idx').on(table.pollId),
  uniqueVote: index('stream_poll_votes_unique_idx').on(table.pollId, table.userId),
}));

// Stream countdown timers (hype builders)
export const streamCountdowns = pgTable('stream_countdowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Countdown content
  label: text('label').notNull(), // e.g., "Giveaway starts in..."
  endsAt: timestamp('ends_at').notNull(),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_countdowns_stream_id_idx').on(table.streamId, table.isActive),
}));

// Poll relations
export const streamPollsRelations = relations(streamPolls, ({ one, many }) => ({
  stream: one(streams, {
    fields: [streamPolls.streamId],
    references: [streams.id],
  }),
  creator: one(users, {
    fields: [streamPolls.creatorId],
    references: [users.id],
  }),
  votes: many(streamPollVotes),
}));

export const streamPollVotesRelations = relations(streamPollVotes, ({ one }) => ({
  poll: one(streamPolls, {
    fields: [streamPollVotes.pollId],
    references: [streamPolls.id],
  }),
  user: one(users, {
    fields: [streamPollVotes.userId],
    references: [users.id],
  }),
}));

export const streamCountdownsRelations = relations(streamCountdowns, ({ one }) => ({
  stream: one(streams, {
    fields: [streamCountdowns.streamId],
    references: [streams.id],
  }),
  creator: one(users, {
    fields: [streamCountdowns.creatorId],
    references: [users.id],
  }),
}));

// Guest request status enum
export const guestRequestStatusEnum = pgEnum('guest_request_status', ['pending', 'invited', 'accepted', 'rejected', 'active', 'ended']);

// Stream guest requests (viewers requesting to join stream as guest)
export const streamGuestRequests = pgTable('stream_guest_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // User info (cached for display)
  username: text('username').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),

  // Request type
  requestType: text('request_type').default('video').notNull(), // 'video' or 'voice'

  // Status tracking
  status: guestRequestStatusEnum('status').default('pending').notNull(),

  // Timing
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  joinedAt: timestamp('joined_at'), // When they actually connected
  endedAt: timestamp('ended_at'),

  // Duration tracking
  durationSeconds: integer('duration_seconds'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  streamIdIdx: index('stream_guest_requests_stream_id_idx').on(table.streamId, table.status),
  userIdIdx: index('stream_guest_requests_user_id_idx').on(table.userId),
  uniqueRequest: index('stream_guest_requests_unique_idx').on(table.streamId, table.userId, table.status),
}));

// Stream guest requests relations
export const streamGuestRequestsRelations = relations(streamGuestRequests, ({ one }) => ({
  stream: one(streams, {
    fields: [streamGuestRequests.streamId],
    references: [streams.id],
  }),
  user: one(users, {
    fields: [streamGuestRequests.userId],
    references: [users.id],
  }),
}));

// Type exports
export type StreamGuestRequest = typeof streamGuestRequests.$inferSelect;
export type NewStreamGuestRequest = typeof streamGuestRequests.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
export type StreamMessage = typeof streamMessages.$inferSelect;
export type NewStreamMessage = typeof streamMessages.$inferInsert;
export type VirtualGift = typeof virtualGifts.$inferSelect;
export type NewVirtualGift = typeof virtualGifts.$inferInsert;
export type StreamGift = typeof streamGifts.$inferSelect;
export type NewStreamGift = typeof streamGifts.$inferInsert;
export type StreamViewer = typeof streamViewers.$inferSelect;
export type NewStreamViewer = typeof streamViewers.$inferInsert;
export type StreamGoal = typeof streamGoals.$inferSelect;
export type NewStreamGoal = typeof streamGoals.$inferInsert;
export type StreamFeaturedCreator = typeof streamFeaturedCreators.$inferSelect;
export type NewStreamFeaturedCreator = typeof streamFeaturedCreators.$inferInsert;
export type StreamTicket = typeof streamTickets.$inferSelect;
export type NewStreamTicket = typeof streamTickets.$inferInsert;
export type StreamBan = typeof streamBans.$inferSelect;
export type NewStreamBan = typeof streamBans.$inferInsert;
export type StreamPoll = typeof streamPolls.$inferSelect;
export type NewStreamPoll = typeof streamPolls.$inferInsert;
export type StreamPollVote = typeof streamPollVotes.$inferSelect;
export type NewStreamPollVote = typeof streamPollVotes.$inferInsert;
export type StreamCountdown = typeof streamCountdowns.$inferSelect;
export type NewStreamCountdown = typeof streamCountdowns.$inferInsert;
