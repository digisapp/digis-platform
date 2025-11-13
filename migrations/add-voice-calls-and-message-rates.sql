-- Add call type enum
CREATE TYPE call_type AS ENUM ('video', 'voice');

-- Add call_type column to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS call_type call_type DEFAULT 'video' NOT NULL;

-- Add voice call rates to creator_settings
ALTER TABLE creator_settings
ADD COLUMN IF NOT EXISTS voice_call_rate_per_minute INTEGER DEFAULT 5 NOT NULL,
ADD COLUMN IF NOT EXISTS minimum_voice_call_duration INTEGER DEFAULT 5 NOT NULL;

-- Add message rate to creator_settings
ALTER TABLE creator_settings
ADD COLUMN IF NOT EXISTS message_rate INTEGER DEFAULT 0 NOT NULL;

-- Add voice call availability to creator_settings
ALTER TABLE creator_settings
ADD COLUMN IF NOT EXISTS is_available_for_voice_calls BOOLEAN DEFAULT true NOT NULL;

-- Add comments
COMMENT ON COLUMN calls.call_type IS 'Type of call: video or voice';
COMMENT ON COLUMN creator_settings.voice_call_rate_per_minute IS 'Coins per minute for voice calls';
COMMENT ON COLUMN creator_settings.minimum_voice_call_duration IS 'Minimum duration in minutes for voice calls';
COMMENT ON COLUMN creator_settings.message_rate IS 'Default cost per message (0 = free)';
COMMENT ON COLUMN creator_settings.is_available_for_voice_calls IS 'Whether creator accepts voice calls';
