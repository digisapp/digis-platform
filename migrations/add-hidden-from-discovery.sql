-- Add isHiddenFromDiscovery field to users table
-- This allows admins to hide creators from discovery without fully suspending them

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_hidden_from_discovery BOOLEAN NOT NULL DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_hidden_from_discovery
ON users (is_hidden_from_discovery)
WHERE role = 'creator';

COMMENT ON COLUMN users.is_hidden_from_discovery IS 'Hide creator from explore, search, and suggestions while still allowing them to use the platform';
