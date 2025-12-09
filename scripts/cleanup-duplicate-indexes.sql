-- Cleanup duplicate indexes for better performance
-- Run this in Supabase SQL Editor

-- 1. calls: keep calls_status_idx, drop idx_calls_status
DROP INDEX IF EXISTS idx_calls_status;

-- 2. conversations: keep idx_conversations_user1_updated, drop idx_conversations_user1
DROP INDEX IF EXISTS idx_conversations_user1;

-- 3. conversations: keep idx_conversations_user2_updated, drop idx_conversations_user2
DROP INDEX IF EXISTS idx_conversations_user2;

-- 4. messages: keep messages_sender_id_idx, drop idx_messages_sender
DROP INDEX IF EXISTS idx_messages_sender;

-- 5. notifications: keep idx_notifications_user_read_created, drop idx_notifications_user_read
DROP INDEX IF EXISTS idx_notifications_user_read;

-- 6. show_tickets: keep idx_show_tickets_show, drop idx_tickets_show
DROP INDEX IF EXISTS idx_tickets_show;

-- 7. shows: keep idx_shows_status, drop idx_shows_live
DROP INDEX IF EXISTS idx_shows_live;

-- 8. shows: keep idx_shows_status_scheduled_start, drop idx_shows_upcoming
DROP INDEX IF EXISTS idx_shows_upcoming;

-- 9. wallet_transactions: keep idx_wallet_tx_user_created, drop idx_wallet_trans_user_created
DROP INDEX IF EXISTS idx_wallet_trans_user_created;

-- 10. wallets: keep wallets_user_id_idx, drop idx_wallets_user
DROP INDEX IF EXISTS idx_wallets_user;

-- Verify cleanup
SELECT 
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
