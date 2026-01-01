-- Migration: Add text search indexes for faster creator search
-- The pg_trgm extension enables fast similarity-based text search with ILIKE

-- Enable pg_trgm extension (for fast text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes for username and display_name columns
-- These make ILIKE searches much faster (O(1) instead of O(n))
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_username_trgm_idx
  ON users USING gin(username gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_display_name_trgm_idx
  ON users USING gin(display_name gin_trgm_ops);

-- Add index on page_views for traffic analytics (if not exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS page_views_created_at_type_idx
  ON page_views(created_at DESC, page_type);

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE page_views;
