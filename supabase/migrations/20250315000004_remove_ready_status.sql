-- Migration: Remove 'ready' status from cloud_item_status enum
-- Convert any 'ready' items to 'private' first, then recreate the enum

-- Step 1: Convert all 'ready' items to 'private'
UPDATE cloud_items SET status = 'private' WHERE status = 'ready';

-- Step 2: Remove default, convert column to text, drop old enum, recreate, convert back
ALTER TABLE cloud_items ALTER COLUMN status DROP DEFAULT;
ALTER TABLE cloud_items ALTER COLUMN status TYPE text;
DROP TYPE cloud_item_status;
CREATE TYPE cloud_item_status AS ENUM ('private', 'live');
ALTER TABLE cloud_items ALTER COLUMN status TYPE cloud_item_status USING status::cloud_item_status;
ALTER TABLE cloud_items ALTER COLUMN status SET DEFAULT 'private'::cloud_item_status;
