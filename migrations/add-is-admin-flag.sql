-- Add isAdmin flag to users table
-- This allows users to be both a creator AND an admin
-- (Previously role was a single enum value, limiting users to one role)

-- Add the is_admin column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Set isAdmin=true for users in admin roles or known admin emails
UPDATE users SET is_admin = true WHERE role = 'admin';
UPDATE users SET is_admin = true WHERE email IN ('nathan@digis.cc', 'admin@digis.cc');

-- Optional: Convert role='admin' users to role='creator' if they should be creators
-- UPDATE users SET role = 'creator' WHERE email = 'nathan@digis.cc' AND role = 'admin';

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;
