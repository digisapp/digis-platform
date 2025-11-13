-- Add city and state columns to profiles table
-- These fields allow users to specify their location

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.city IS 'User city location';
COMMENT ON COLUMN profiles.state IS 'User state/province location';
