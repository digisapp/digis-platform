-- Add promo_credit to transaction_type enum
ALTER TYPE "transaction_type" ADD VALUE IF NOT EXISTS 'promo_credit';

-- Create redemption_codes table
CREATE TABLE IF NOT EXISTS "redemption_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL UNIQUE,
  "coin_amount" integer NOT NULL,
  "batch_name" text,
  "is_redeemed" boolean DEFAULT false NOT NULL,
  "redeemed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "redeemed_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "redemption_codes_code_idx" ON "redemption_codes" ("code");
CREATE INDEX IF NOT EXISTS "redemption_codes_batch_idx" ON "redemption_codes" ("batch_name");
CREATE INDEX IF NOT EXISTS "redemption_codes_redeemed_idx" ON "redemption_codes" ("is_redeemed");
