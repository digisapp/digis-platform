-- Row Level Security (RLS) Policies for Digis
-- This provides defense-in-depth security even though we use Drizzle ORM
-- Run this in Supabase SQL Editor

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vods ENABLE ROW LEVEL SECURITY;
ALTER TABLE vod_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_banking_info ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE
-- ============================================

-- Users can read their own data
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read basic public info of other users (for profiles, search, etc.)
CREATE POLICY "users_read_public" ON users
  FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- PROFILES TABLE
-- ============================================

CREATE POLICY "profiles_read_all" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- WALLETS TABLE
-- ============================================

-- Users can only see their own wallet
CREATE POLICY "wallets_read_own" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallets_update_own" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "wallets_insert_own" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- WALLET TRANSACTIONS TABLE
-- ============================================

-- Users can see transactions where they are involved
CREATE POLICY "wallet_transactions_read_own" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only system/service role can insert transactions (handled by API)
-- No direct user insert policy - transactions go through API

-- ============================================
-- SPEND HOLDS TABLE
-- ============================================

CREATE POLICY "spend_holds_read_own" ON spend_holds
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================

-- Users can see conversations they're part of
CREATE POLICY "conversations_read_own" ON conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_update_own" ON conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================

-- Users can see messages in their conversations
CREATE POLICY "messages_read_own" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Users can send messages (insert) in their conversations
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Users can update their own messages (for read status, etc.)
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Users can delete their own messages
CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- MESSAGE REQUESTS TABLE
-- ============================================

CREATE POLICY "message_requests_read_own" ON message_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "message_requests_insert" ON message_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "message_requests_update" ON message_requests
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ============================================
-- BLOCKED USERS TABLE
-- ============================================

CREATE POLICY "blocked_users_read_own" ON blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_insert" ON blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocked_users_delete" ON blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================
-- CALLS TABLE
-- ============================================

-- Users can see calls they're part of
CREATE POLICY "calls_read_own" ON calls
  FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = creator_id);

CREATE POLICY "calls_insert" ON calls
  FOR INSERT WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "calls_update" ON calls
  FOR UPDATE USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- ============================================
-- CREATOR SETTINGS TABLE
-- ============================================

-- Anyone can read creator settings (for rate display)
CREATE POLICY "creator_settings_read_all" ON creator_settings
  FOR SELECT USING (true);

-- Only the creator can update their settings
CREATE POLICY "creator_settings_update_own" ON creator_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "creator_settings_insert_own" ON creator_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STREAMS TABLE
-- ============================================

-- Public streams are visible to all, private based on access
CREATE POLICY "streams_read_public" ON streams
  FOR SELECT USING (
    privacy = 'public'
    OR creator_id = auth.uid()
    OR (privacy = 'members_only' AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = streams.creator_id
    ))
    OR (privacy IN ('private_group', 'private_1on1') AND EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = auth.uid()
      AND creator_id = streams.creator_id
      AND status = 'active'
    ))
  );

CREATE POLICY "streams_insert_creator" ON streams
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "streams_update_creator" ON streams
  FOR UPDATE USING (auth.uid() = creator_id);

-- ============================================
-- STREAM MESSAGES TABLE
-- ============================================

-- Anyone who can see the stream can see messages
CREATE POLICY "stream_messages_read" ON stream_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streams s
      WHERE s.id = stream_messages.stream_id
      AND (
        s.privacy = 'public'
        OR s.creator_id = auth.uid()
      )
    )
  );

CREATE POLICY "stream_messages_insert" ON stream_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STREAM GIFTS TABLE
-- ============================================

CREATE POLICY "stream_gifts_read" ON stream_gifts
  FOR SELECT USING (true);

CREATE POLICY "stream_gifts_insert" ON stream_gifts
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- STREAM VIEWERS TABLE
-- ============================================

CREATE POLICY "stream_viewers_read" ON stream_viewers
  FOR SELECT USING (true);

CREATE POLICY "stream_viewers_insert" ON stream_viewers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "stream_viewers_delete" ON stream_viewers
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STREAM GOALS TABLE
-- ============================================

CREATE POLICY "stream_goals_read" ON stream_goals
  FOR SELECT USING (true);

CREATE POLICY "stream_goals_insert" ON stream_goals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM streams WHERE id = stream_id AND creator_id = auth.uid())
  );

CREATE POLICY "stream_goals_update" ON stream_goals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM streams WHERE id = stream_id AND creator_id = auth.uid())
  );

-- ============================================
-- VIRTUAL GIFTS TABLE
-- ============================================

-- Everyone can see available gifts
CREATE POLICY "virtual_gifts_read_all" ON virtual_gifts
  FOR SELECT USING (true);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================

-- Users can see their own subscriptions, creators can see who subscribes to them
CREATE POLICY "subscriptions_read" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- ============================================
-- SUBSCRIPTION TIERS TABLE
-- ============================================

-- Everyone can see subscription tiers
CREATE POLICY "subscription_tiers_read_all" ON subscription_tiers
  FOR SELECT USING (true);

-- Only creators can manage their tiers
CREATE POLICY "subscription_tiers_insert" ON subscription_tiers
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "subscription_tiers_update" ON subscription_tiers
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "subscription_tiers_delete" ON subscription_tiers
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================
-- SUBSCRIPTION PAYMENTS TABLE
-- ============================================

CREATE POLICY "subscription_payments_read" ON subscription_payments
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- ============================================
-- CONTENT ITEMS TABLE
-- ============================================

-- Public content visible to all, locked content visible to purchasers
CREATE POLICY "content_items_read" ON content_items
  FOR SELECT USING (
    is_free = true
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM content_purchases
      WHERE content_id = content_items.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "content_items_insert" ON content_items
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "content_items_update" ON content_items
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "content_items_delete" ON content_items
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================
-- CONTENT PURCHASES TABLE
-- ============================================

CREATE POLICY "content_purchases_read" ON content_purchases
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "content_purchases_insert" ON content_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SHOWS TABLE
-- ============================================

CREATE POLICY "shows_read_all" ON shows
  FOR SELECT USING (true);

CREATE POLICY "shows_insert" ON shows
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "shows_update" ON shows
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "shows_delete" ON shows
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================
-- SHOW TICKETS TABLE
-- ============================================

CREATE POLICY "show_tickets_read" ON show_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM shows WHERE id = show_id AND creator_id = auth.uid())
  );

CREATE POLICY "show_tickets_insert" ON show_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FOLLOWS TABLE
-- ============================================

CREATE POLICY "follows_read_all" ON follows
  FOR SELECT USING (true);

CREATE POLICY "follows_insert" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- VODS TABLE
-- ============================================

CREATE POLICY "vods_read" ON vods
  FOR SELECT USING (
    access_type = 'public'
    OR creator_id = auth.uid()
    OR (access_type = 'subscribers' AND EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = auth.uid() AND creator_id = vods.creator_id AND status = 'active'
    ))
    OR (access_type = 'ppv' AND EXISTS (
      SELECT 1 FROM vod_purchases WHERE vod_id = vods.id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "vods_insert" ON vods
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "vods_update" ON vods
  FOR UPDATE USING (auth.uid() = creator_id);

-- ============================================
-- VOD PURCHASES TABLE
-- ============================================

CREATE POLICY "vod_purchases_read" ON vod_purchases
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "vod_purchases_insert" ON vod_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CREATOR APPLICATIONS TABLE
-- ============================================

CREATE POLICY "creator_applications_read_own" ON creator_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "creator_applications_insert" ON creator_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CREATOR GOALS TABLE
-- ============================================

CREATE POLICY "creator_goals_read_all" ON creator_goals
  FOR SELECT USING (true);

CREATE POLICY "creator_goals_insert" ON creator_goals
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "creator_goals_update" ON creator_goals
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "creator_goals_delete" ON creator_goals
  FOR DELETE USING (auth.uid() = creator_id);

-- ============================================
-- PAYOUT REQUESTS TABLE
-- ============================================

CREATE POLICY "payout_requests_read_own" ON payout_requests
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "payout_requests_insert" ON payout_requests
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- CREATOR BANKING INFO TABLE
-- ============================================

-- Only the creator can see/manage their banking info
CREATE POLICY "creator_banking_info_read_own" ON creator_banking_info
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "creator_banking_info_insert" ON creator_banking_info
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "creator_banking_info_update" ON creator_banking_info
  FOR UPDATE USING (auth.uid() = creator_id);

-- ============================================
-- SERVICE ROLE BYPASS
-- ============================================
-- Note: The service role key (used by your API routes) automatically
-- bypasses RLS. This is by design - your Drizzle ORM queries through
-- API routes will work normally. These policies only apply to direct
-- database access with the anon key or user JWT tokens.
