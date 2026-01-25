-- Creator Applications table for approval workflow
-- This allows fans to apply to become creators, with admin approval required

-- Create application status enum
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create creator_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Application details
  instagram_handle TEXT,
  tiktok_handle TEXT,
  other_social_links TEXT,
  follower_count TEXT,
  content_category TEXT,
  bio TEXT,

  -- Status
  status application_status NOT NULL DEFAULT 'pending',

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  admin_notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add new columns if table already exists (for existing deployments)
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS other_social_links TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS follower_count TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS content_category TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS age_confirmed BOOLEAN DEFAULT false;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id);
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE creator_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS creator_applications_user_idx ON creator_applications(user_id);
CREATE INDEX IF NOT EXISTS creator_applications_status_idx ON creator_applications(status);
CREATE INDEX IF NOT EXISTS creator_applications_created_at_idx ON creator_applications(created_at);

-- Ensure only one pending application per user
CREATE UNIQUE INDEX IF NOT EXISTS creator_applications_user_pending_idx
ON creator_applications(user_id)
WHERE status = 'pending';
