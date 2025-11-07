-- Performance indexes for slow queries
-- Run this with: psql $DATABASE_URL -f scripts/add-performance-indexes.sql

-- Index for explore page (role + online status + followers)
CREATE INDEX IF NOT EXISTS idx_users_role_online_followers 
  ON users(role, is_online DESC, follower_count DESC) 
  WHERE role = 'creator';

-- Index for explore search
CREATE INDEX IF NOT EXISTS idx_users_search 
  ON users USING gin(to_tsvector('english', coalesce(username, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(bio, '')));

-- Indexes for conversations queries
CREATE INDEX IF NOT EXISTS idx_conversations_user1_last_message 
  ON conversations(user1_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user2_last_message 
  ON conversations(user2_id, last_message_at DESC);

-- Index for messages by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON messages(conversation_id, is_read, sender_id) 
  WHERE is_read = false;

-- Index for streams by creator
CREATE INDEX IF NOT EXISTS idx_streams_creator_status 
  ON streams(creator_id, status, started_at DESC);

-- Index for stream viewers
CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream 
  ON stream_viewers(stream_id, last_seen_at DESC);

-- Analyze tables for query planner
ANALYZE users;
ANALYZE conversations;
ANALYZE messages;
ANALYZE streams;
ANALYZE stream_viewers;

