-- Add payout_method enum and column to payout_requests
DO $$ BEGIN
  CREATE TYPE payout_method AS ENUM ('bank_transfer', 'payoneer', 'crypto');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS payout_method payout_method NOT NULL DEFAULT 'bank_transfer';

CREATE INDEX IF NOT EXISTS payout_requests_payout_method_idx ON payout_requests (payout_method);
