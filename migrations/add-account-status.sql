-- Add account_status enum type if not exists
DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add account_status column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'active';

-- Create index for querying by status
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
