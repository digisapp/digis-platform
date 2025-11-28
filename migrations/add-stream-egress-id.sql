-- Add egress_id column to streams table for VOD recording
-- This stores the LiveKit Egress ID for stream recordings

ALTER TABLE streams ADD COLUMN IF NOT EXISTS egress_id TEXT;

COMMENT ON COLUMN streams.egress_id IS 'LiveKit Egress ID for stream recording';
