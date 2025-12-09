-- Explore page performance indexes
-- Run this in Supabase SQL editor

-- Index for explore page main query (creators sorted by online status + followers)
CREATE INDEX IF NOT EXISTS idx_users_role_online_followers
ON users (role, is_online DESC, follower_count DESC);

-- Index for creator role filter
CREATE INDEX IF NOT EXISTS idx_users_role
ON users (role);

-- Index for live streams lookup
CREATE INDEX IF NOT EXISTS idx_streams_status_creator
ON streams (status, creator_id);

-- Index for username lookups (profile pages)
CREATE INDEX IF NOT EXISTS idx_users_username_lower
ON users (lower(username));

-- Index for created_at sorting (new creators filter)
CREATE INDEX IF NOT EXISTS idx_users_role_created
ON users (role, created_at DESC);

-- Analyze tables to update query planner statistics
ANALYZE users;
ANALYZE streams;
