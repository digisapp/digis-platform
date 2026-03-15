-- Migration: Rename drops_* → cloud_* (Digis Cloud + Drops branding)
-- Cloud = private creator vault, Drops = published content on profile

-- ─── Rename Tables ──────────────────────────────────────────────────────────

ALTER TABLE drops_items RENAME TO cloud_items;
ALTER TABLE drops_tags RENAME TO cloud_tags;
ALTER TABLE drops_item_tags RENAME TO cloud_item_tags;
ALTER TABLE drops_packs RENAME TO cloud_packs;
ALTER TABLE drops_pack_items RENAME TO cloud_pack_items;
ALTER TABLE drops_purchases RENAME TO cloud_purchases;
ALTER TABLE drops_scheduled_drops RENAME TO cloud_scheduled_drops;
ALTER TABLE drops_creator_streaks RENAME TO cloud_creator_streaks;
ALTER TABLE drops_locked_messages RENAME TO cloud_locked_messages;
ALTER TABLE drops_locked_message_items RENAME TO cloud_locked_message_items;
ALTER TABLE drops_locked_message_recipients RENAME TO cloud_locked_message_recipients;
-- creator_pricing_defaults stays the same (no drops_ prefix)

-- ─── Rename Enums ───────────────────────────────────────────────────────────

ALTER TYPE drops_item_type RENAME TO cloud_item_type;
ALTER TYPE drops_item_status RENAME TO cloud_item_status;
ALTER TYPE drops_pack_status RENAME TO cloud_pack_status;

-- ─── Rename wallet transaction type enum values ─────────────────────────────

ALTER TYPE transaction_type RENAME VALUE 'drops_purchase' TO 'cloud_purchase';
ALTER TYPE transaction_type RENAME VALUE 'drops_earnings' TO 'cloud_earnings';
ALTER TYPE transaction_type RENAME VALUE 'drops_pack_purchase' TO 'cloud_pack_purchase';
ALTER TYPE transaction_type RENAME VALUE 'drops_pack_earnings' TO 'cloud_pack_earnings';
ALTER TYPE transaction_type RENAME VALUE 'drops_locked_message' TO 'cloud_locked_message';
ALTER TYPE transaction_type RENAME VALUE 'drops_locked_message_earnings' TO 'cloud_locked_message_earnings';

-- ─── Rename Indexes (drops_items) ───────────────────────────────────────────

ALTER INDEX drops_items_creator_idx RENAME TO cloud_items_creator_idx;
ALTER INDEX drops_items_creator_status_idx RENAME TO cloud_items_creator_status_idx;
ALTER INDEX drops_items_published_idx RENAME TO cloud_items_published_idx;

-- ─── Rename Indexes (drops_tags) ────────────────────────────────────────────

ALTER INDEX drops_tags_creator_idx RENAME TO cloud_tags_creator_idx;
ALTER INDEX drops_tags_unique RENAME TO cloud_tags_unique;

-- ─── Rename Indexes (drops_item_tags) ───────────────────────────────────────

ALTER INDEX drops_item_tags_item_idx RENAME TO cloud_item_tags_item_idx;
ALTER INDEX drops_item_tags_tag_idx RENAME TO cloud_item_tags_tag_idx;
ALTER INDEX drops_item_tags_unique RENAME TO cloud_item_tags_unique;

-- ─── Rename Indexes (drops_packs) ───────────────────────────────────────────

ALTER INDEX drops_packs_creator_idx RENAME TO cloud_packs_creator_idx;
ALTER INDEX drops_packs_creator_status_idx RENAME TO cloud_packs_creator_status_idx;

-- ─── Rename Indexes (drops_pack_items) ──────────────────────────────────────

ALTER INDEX drops_pack_items_pack_idx RENAME TO cloud_pack_items_pack_idx;
ALTER INDEX drops_pack_items_unique RENAME TO cloud_pack_items_unique;

-- ─── Rename Indexes (drops_purchases) ───────────────────────────────────────

ALTER INDEX drops_purchases_buyer_idx RENAME TO cloud_purchases_buyer_idx;
ALTER INDEX drops_purchases_creator_idx RENAME TO cloud_purchases_creator_idx;
ALTER INDEX drops_purchases_item_idx RENAME TO cloud_purchases_item_idx;
ALTER INDEX drops_purchases_pack_idx RENAME TO cloud_purchases_pack_idx;
ALTER INDEX drops_purchases_unique_item RENAME TO cloud_purchases_unique_item;
ALTER INDEX drops_purchases_unique_pack RENAME TO cloud_purchases_unique_pack;

-- ─── Rename Indexes (drops_scheduled_drops) ─────────────────────────────────

ALTER INDEX drops_scheduled_drops_creator_idx RENAME TO cloud_scheduled_drops_creator_idx;
ALTER INDEX drops_scheduled_drops_status_idx RENAME TO cloud_scheduled_drops_status_idx;
ALTER INDEX drops_scheduled_drops_scheduled_idx RENAME TO cloud_scheduled_drops_scheduled_idx;
ALTER INDEX drops_scheduled_drops_item_idx RENAME TO cloud_scheduled_drops_item_idx;
ALTER INDEX drops_scheduled_drops_batch_idx RENAME TO cloud_scheduled_drops_batch_idx;

-- ─── Rename Indexes (drops_creator_streaks) ─────────────────────────────────

ALTER INDEX drops_creator_streaks_creator_idx RENAME TO cloud_creator_streaks_creator_idx;

-- ─── Rename Indexes (drops_locked_messages) ─────────────────────────────────

ALTER INDEX drops_locked_messages_creator_idx RENAME TO cloud_locked_messages_creator_idx;

-- ─── Rename Indexes (drops_locked_message_items) ────────────────────────────

ALTER INDEX drops_locked_message_items_message_idx RENAME TO cloud_locked_message_items_message_idx;
ALTER INDEX drops_locked_message_items_unique RENAME TO cloud_locked_message_items_unique;

-- ─── Rename Indexes (drops_locked_message_recipients) ───────────────────────

ALTER INDEX drops_locked_msg_recipients_message_idx RENAME TO cloud_locked_msg_recipients_message_idx;
ALTER INDEX drops_locked_msg_recipients_recipient_idx RENAME TO cloud_locked_msg_recipients_recipient_idx;
ALTER INDEX drops_locked_msg_recipients_unique RENAME TO cloud_locked_msg_recipients_unique;
