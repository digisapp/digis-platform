-- Add Knowledge Base columns to AI Twin settings
-- This allows creators to provide deep context about themselves for the AI

ALTER TABLE ai_twin_settings
ADD COLUMN IF NOT EXISTS knowledge_location text,
ADD COLUMN IF NOT EXISTS knowledge_expertise text[],
ADD COLUMN IF NOT EXISTS knowledge_base text;

-- Add comment for documentation
COMMENT ON COLUMN ai_twin_settings.knowledge_location IS 'Where the creator is from (city, country)';
COMMENT ON COLUMN ai_twin_settings.knowledge_expertise IS 'Array of expertise areas/topics the creator knows about';
COMMENT ON COLUMN ai_twin_settings.knowledge_base IS 'Large free-form text about creator life, background, expertise for AI context';
