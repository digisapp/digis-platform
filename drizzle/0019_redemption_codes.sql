-- Add promo_credit to transaction_type enum
ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'promo_credit';

-- Create redemption_codes table
CREATE TABLE IF NOT EXISTS "redemption_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "coin_amount" integer NOT NULL,
  "batch_name" text,
  "max_redemptions" integer, -- null = unlimited
  "redemption_count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create code_redemptions table (tracks each user's redemption)
CREATE TABLE IF NOT EXISTS "code_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code_id" uuid NOT NULL REFERENCES "redemption_codes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "redeemed_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "redemption_codes_code_idx" ON "redemption_codes" ("code");
CREATE INDEX IF NOT EXISTS "redemption_codes_batch_idx" ON "redemption_codes" ("batch_name");
CREATE UNIQUE INDEX IF NOT EXISTS "code_redemptions_user_code_idx" ON "code_redemptions" ("user_id", "code_id");
CREATE INDEX IF NOT EXISTS "code_redemptions_code_idx" ON "code_redemptions" ("code_id");
