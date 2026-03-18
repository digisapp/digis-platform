-- Add processing pipeline columns to cloud_items
-- Phase 1: Processing status tracking + video playback URL

-- Browser-ready version of the file (e.g. remuxed .mp4 for .mov uploads)
ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS playback_url text;

-- Processing state machine: pending → processing → ready | failed
ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending';
ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS processing_error text;
ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS processing_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE cloud_items ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Index for the cron processor to efficiently find pending/failed items
CREATE INDEX IF NOT EXISTS cloud_items_processing_idx ON cloud_items (processing_status);

-- Backfill existing items: mark items with proper thumbnails as 'ready',
-- items where thumbnail = fileUrl as 'pending' (needs reprocessing)
UPDATE cloud_items
SET processing_status = 'ready',
    processed_at = uploaded_at
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url != file_url;

-- Items that were never properly processed stay as 'pending' (default)
-- The cron will pick them up on next run
