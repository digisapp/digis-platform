-- Add creator_card_image_url column to users table
-- This field stores a 16:9 image URL for display on creator cards in the explore page

ALTER TABLE users
ADD COLUMN IF NOT EXISTS creator_card_image_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN users.creator_card_image_url IS '16:9 aspect ratio image for creator card display on explore page';
