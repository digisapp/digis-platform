-- Performance indexes to speed up dashboard queries
-- Fixed to match actual schema

-- Streams: creator's list & status filters (if not exists)
CREATE INDEX IF NOT EXISTS idx_streams_creator_created
ON streams (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_streams_status_created
ON streams (status, created_at DESC);

-- Calls: creator and fan queries
CREATE INDEX IF NOT EXISTS idx_calls_creator_status_created
ON calls (creator_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_fan_created
ON calls (fan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_status_requested
ON calls (status, requested_at DESC);

-- Messages/Conversations: Note - many indexes already exist in schema
-- Only add if they don't exist
CREATE INDEX IF NOT EXISTS idx_conversations_user1_updated
ON conversations (user1_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user2_updated
ON conversations (user2_id, updated_at DESC);

-- Wallet: user transaction history
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created
ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_status_created
ON wallet_transactions (user_id, status, created_at DESC);

-- Notifications: by user, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON notifications (user_id, is_read, created_at DESC);

-- Shows: creator shows ordered by schedule
CREATE INDEX IF NOT EXISTS idx_shows_creator_scheduled
ON shows (creator_id, scheduled_for DESC);

-- Stream gifts: for analytics aggregations
CREATE INDEX IF NOT EXISTS idx_stream_gifts_stream_sender
ON stream_gifts (stream_id, sender_id);

-- Follows: for follower/following counts
CREATE INDEX IF NOT EXISTS idx_follows_follower_created
ON follows (follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_following_created
ON follows (following_id, created_at DESC);

-- Search optimization (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_search_username
ON users USING gin(username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_search_display_name
ON users USING gin(display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_search_bio
ON users USING gin(bio gin_trgm_ops);

-- Composite index for online creators with follower sort
CREATE INDEX IF NOT EXISTS idx_users_online_followers
ON users (is_online DESC, follower_count DESC)
WHERE role = 'creator';
