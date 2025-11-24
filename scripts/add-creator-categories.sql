-- Add category fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS primary_category TEXT,
ADD COLUMN IF NOT EXISTS secondary_category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS users_primary_category_idx ON users(primary_category) WHERE role = 'creator';
CREATE INDEX IF NOT EXISTS users_secondary_category_idx ON users(secondary_category) WHERE role = 'creator';

-- Add comment
COMMENT ON COLUMN users.primary_category IS 'Main content category for creators (e.g., Gaming, Music)';
COMMENT ON COLUMN users.secondary_category IS 'Optional secondary content category for creators';
