-- Migration: Copy contentItems → cloudItems
-- This preserves ALL existing creator content — nothing is deleted.
-- After this migration, profile pages will read from cloud_items instead of content_items.
-- The content_items table is kept as-is for safety (can be dropped later after verification).

-- Step 1: Copy all content_items into cloud_items with field mapping
-- Gallery items become 'photo' type (primary image used)
INSERT INTO cloud_items (
  id,
  creator_id,
  file_url,
  preview_url,
  thumbnail_url,
  type,
  duration_seconds,
  size_bytes,
  status,
  price_coins,
  uploaded_at,
  published_at
)
SELECT
  id,
  creator_id,
  media_url,                                          -- fileUrl = original media
  NULL,                                               -- no preview generated yet
  thumbnail_url,                                      -- keep existing thumbnail
  CASE
    WHEN content_type = 'video' THEN 'video'::cloud_item_type
    ELSE 'photo'::cloud_item_type                     -- gallery → photo
  END,
  duration_seconds,
  NULL,                                               -- sizeBytes not tracked in old system
  CASE
    WHEN is_published = true THEN 'live'::cloud_item_status
    ELSE 'private'::cloud_item_status
  END,
  CASE
    WHEN is_free = true THEN NULL                     -- free content = null price
    ELSE unlock_price
  END,
  created_at,                                         -- uploadedAt = createdAt
  CASE
    WHEN is_published = true THEN created_at          -- publishedAt for live items
    ELSE NULL
  END
FROM content_items
ON CONFLICT (id) DO NOTHING;                          -- Idempotent — safe to re-run

-- Step 2: Migrate content_purchases → cloud_purchases
-- Maps the old purchase records so buyers don't lose access
INSERT INTO cloud_purchases (
  id,
  buyer_id,
  creator_id,
  item_id,
  pack_id,
  coins_spent,
  transaction_id,
  idempotency_key,
  purchased_at
)
SELECT
  cp.id,
  cp.user_id,
  ci.creator_id,
  cp.content_id,                                      -- item_id = old content_id
  NULL,                                               -- no pack
  cp.coins_spent,
  cp.transaction_id,
  'migrated_' || cp.id,                              -- unique idempotency key
  cp.unlocked_at
FROM content_purchases cp
JOIN content_items ci ON ci.id = cp.content_id
ON CONFLICT (id) DO NOTHING;                          -- Idempotent
