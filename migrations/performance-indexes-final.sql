-- Performance indexes to speed up dashboard queries
-- Final version - corrected column names and removed duplicates

-- Streams: creator's list & status filters
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

-- Conversations: for inbox queries
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

-- Shows: Note - idx_shows_creator already exists with (creator_id, scheduled_start)
-- No additional index needed

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

-- ============================================
-- SUBSCRIPTION INDEXES (Critical for scaling)
-- ============================================

-- Creator's active subscribers (most common query)
CREATE INDEX IF NOT EXISTS idx_subs_creator_active
ON subscriptions (creator_id, status, expires_at DESC)
WHERE status = 'active';

-- User's active subscriptions
CREATE INDEX IF NOT EXISTS idx_subs_user_active
ON subscriptions (user_id, status, expires_at DESC)
WHERE status = 'active';

-- Renewal batch processing (cron job)
CREATE INDEX IF NOT EXISTS idx_subs_renewal_due
ON subscriptions (next_billing_date, status)
WHERE status = 'active' AND auto_renew = true;

-- ============================================
-- WALLET INDEXES (Critical for scaling)
-- ============================================

-- Idempotency key lookups (prevent duplicate transactions)
CREATE INDEX IF NOT EXISTS idx_wallet_tx_idempotency
ON wallet_transactions (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- ============================================
-- MESSAGE INDEXES (Critical for scaling)
-- ============================================

-- Unread messages per conversation
CREATE INDEX IF NOT EXISTS idx_messages_unread
ON messages (conversation_id, is_read, created_at DESC)
WHERE is_read = false;

-- ============================================
-- ANALYZE ALL TABLES
-- ============================================
ANALYZE users;
ANALYZE wallets;
ANALYZE wallet_transactions;
ANALYZE subscriptions;
ANALYZE conversations;
ANALYZE messages;
ANALYZE streams;
ANALYZE calls;
ANALYZE notifications;
ANALYZE follows;
