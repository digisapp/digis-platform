-- Add metadata and showTopTippers columns to creator_goals table
-- This enables tracking top contributors and creator control over visibility

ALTER TABLE creator_goals
ADD COLUMN IF NOT EXISTS metadata TEXT,
ADD COLUMN IF NOT EXISTS show_top_tippers BOOLEAN DEFAULT true NOT NULL;

-- Update existing goals to have default showTopTippers value
UPDATE creator_goals
SET show_top_tippers = true
WHERE show_top_tippers IS NULL;
