# Week 7: Direct Messaging (DMs) - Implementation Plan

## Goal
Build a private messaging system with monetization features including PPV locked messages, media sharing, and in-chat tipping.

## Exit Criteria
- [x] Users can send direct messages to each other
- [x] Creators can require message requests from non-subscribers
- [x] Fans can send locked PPV messages (pay to unlock)
- [x] Media sharing (photos/videos) in DMs
- [x] Tip creators directly in DMs
- [x] Real-time message delivery
- [x] Read receipts and typing indicators
- [x] Inbox management with unread counts
- [x] Block/report users

## Business Model

**Creator Revenue Examples:**

**Locked Messages:**
- Creator sends exclusive photo message
- Fan pays 20 coins to unlock and view
- Creator gets 100% = 20 coins ($2)

**DM Tips:**
- Fan tips 50 coins during conversation
- Creator gets 100% = 50 coins ($5)

**High-Value Use Cases:**
- Exclusive behind-the-scenes content
- Personal shoutouts/greetings
- Custom content requests
- Private consultations
- 1-on-1 coaching/advice

## Database Schema

### 1. Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Participants (always 2 users for 1-on-1)
  user1_id UUID REFERENCES users(id) NOT NULL,
  user2_id UUID REFERENCES users(id) NOT NULL,

  -- Last Message
  last_message_id UUID REFERENCES messages(id),
  last_message_at TIMESTAMP,
  last_message_preview TEXT,

  -- Unread Counts (denormalized for performance)
  user1_unread_count INTEGER DEFAULT 0,
  user2_unread_count INTEGER DEFAULT 0,

  -- Settings
  user1_archived BOOLEAN DEFAULT false,
  user2_archived BOOLEAN DEFAULT false,
  user1_muted BOOLEAN DEFAULT false,
  user2_muted BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user1_id, user2_id)
);

CREATE INDEX idx_conversations_user1 ON conversations(user1_id, last_message_at DESC);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id, last_message_at DESC);
```

### 2. Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) NOT NULL,
  receiver_id UUID REFERENCES users(id) NOT NULL,

  -- Message Content
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'media', 'tip', 'locked', 'system')),
  content TEXT, -- Message text or system message

  -- Media
  media_url TEXT,
  media_type TEXT, -- 'photo', 'video', 'audio'
  thumbnail_url TEXT,

  -- Locked/PPV Messages
  is_locked BOOLEAN DEFAULT false,
  unlock_price INTEGER, -- In coins
  unlocked_by UUID REFERENCES users(id), -- Who unlocked it
  unlocked_at TIMESTAMP,

  -- Tips
  tip_amount INTEGER, -- In coins
  tip_transaction_id UUID REFERENCES wallet_transactions(id),

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  is_deleted_by_sender BOOLEAN DEFAULT false,
  is_deleted_by_receiver BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON messages(receiver_id, is_read);
CREATE INDEX idx_messages_locked ON messages(is_locked, unlocked_at) WHERE is_locked = true;
```

### 3. Message Requests Table
```sql
CREATE TABLE message_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) NOT NULL,
  to_user_id UUID REFERENCES users(id) NOT NULL,

  -- Request Message
  message TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),

  -- Response
  responded_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX idx_requests_to_user ON message_requests(to_user_id, status, created_at DESC);
CREATE INDEX idx_requests_status ON message_requests(status) WHERE status = 'pending';
```

### 4. Message Settings Table
```sql
CREATE TABLE message_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id),

  -- Privacy Settings
  allow_messages_from TEXT DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'subscribers', 'nobody')),
  require_message_request BOOLEAN DEFAULT false, -- For creators

  -- Notifications
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,

  -- Auto-Response (for creators)
  auto_response_enabled BOOLEAN DEFAULT false,
  auto_response_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Blocked Users Table
```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES users(id) NOT NULL,
  blocked_id UUID REFERENCES users(id) NOT NULL,

  reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_blocked ON blocked_users(blocked_id);
```

### 6. Typing Indicators Table (Redis or temp table)
```sql
-- Can use Redis instead for better performance
CREATE TABLE typing_indicators (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) NOT NULL,

  started_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (conversation_id, user_id)
);

-- Auto-delete after 10 seconds (use Redis TTL or cron job)
```

## API Routes

### Conversations
- `GET /api/messages/conversations` - Get user's conversation list
- `GET /api/messages/conversations/[conversationId]` - Get conversation details
- `POST /api/messages/conversations/[conversationId]/archive` - Archive conversation
- `POST /api/messages/conversations/[conversationId]/mute` - Mute notifications
- `DELETE /api/messages/conversations/[conversationId]` - Delete conversation

### Messages
- `GET /api/messages/conversations/[conversationId]/messages` - Get messages (paginated)
- `POST /api/messages/send` - Send message
- `POST /api/messages/[messageId]/read` - Mark as read
- `POST /api/messages/[messageId]/unlock` - Unlock PPV message
- `DELETE /api/messages/[messageId]` - Delete message

### Locked Messages
- `POST /api/messages/send-locked` - Send locked PPV message
- `GET /api/messages/locked-earnings` - Get earnings from locked messages

### Tips
- `POST /api/messages/tip` - Send tip in DM
- `GET /api/messages/tip-earnings` - Get tip earnings

### Message Requests
- `GET /api/messages/requests` - Get pending requests
- `POST /api/messages/request` - Send message request
- `POST /api/messages/requests/[requestId]/accept` - Accept request
- `POST /api/messages/requests/[requestId]/reject` - Reject request

### Settings
- `GET /api/messages/settings` - Get user's message settings
- `PATCH /api/messages/settings` - Update settings

### Moderation
- `POST /api/messages/block` - Block user
- `POST /api/messages/unblock` - Unblock user
- `POST /api/messages/report` - Report message/user

### Real-time
- `POST /api/messages/typing` - Update typing status
- `GET /api/messages/unread-count` - Get total unread count

## Frontend Pages

### Main Inbox
1. **MessagesInbox** (`/messages`)
   - List of conversations (sorted by last message)
   - Unread count badges
   - Search conversations
   - Filter: All / Unread / Archived / Requests
   - Preview: last message, timestamp, avatar
   - Empty state with CTA

### Conversation View
2. **ConversationView** (`/messages/[conversationId]`)
   - Message thread (infinite scroll up)
   - Message composer at bottom
   - Media attachment button
   - Send locked message button (creators)
   - Send tip button
   - Typing indicator
   - Read receipts
   - Conversation settings menu

### Message Requests
3. **MessageRequests** (`/messages/requests`)
   - List of pending requests
   - Accept/Reject buttons
   - Preview first message
   - Requester profile preview

### Settings
4. **MessageSettings** (`/messages/settings`)
   - Who can message you selector
   - Require message requests toggle
   - Notification preferences
   - Auto-response setup
   - Blocked users list

## Components

### Core Components

5. **ConversationListItem**
   - User avatar
   - Display name
   - Last message preview
   - Timestamp (relative)
   - Unread badge
   - Typing indicator
   - Click to open conversation

6. **MessageBubble**
   - Different styles for sent/received
   - Text content
   - Media preview
   - Locked message overlay
   - Tip display
   - Read receipt
   - Timestamp
   - Long-press menu (delete, copy)

7. **LockedMessageCard**
   - Blurred preview
   - Lock icon + price
   - "Unlock for X coins" button
   - Creator badge

8. **MessageComposer**
   - Text input with auto-resize
   - Media picker button
   - Send button
   - Character counter (optional)
   - Emoji picker

9. **SendLockedMessageModal**
   - Message preview
   - Price selector
   - Preview toggle (show/hide content)
   - Estimated earnings
   - Send button

10. **TipModal**
    - Amount selector (preset + custom)
    - Message input (optional)
    - Balance display
    - Send tip button

11. **MediaPreview**
    - Photo/video viewer
    - Download button
    - Full-screen mode
    - Swipe through media

## Real-Time Features (Supabase Realtime)

### Subscriptions:
```typescript
// Subscribe to conversation messages
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => handleNewMessage(payload)
  )
  .subscribe()

// Subscribe to typing indicators
supabase
  .channel(`typing:${conversationId}`)
  .on('presence', { event: 'sync' }, () => handleTypingUpdate())
  .subscribe()

// Subscribe to inbox updates (all conversations)
supabase
  .channel(`inbox:${userId}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'conversations' },
    (payload) => handleConversationUpdate(payload)
  )
  .subscribe()
```

## Message Service (`src/lib/messages/message-service.ts`)

### Key Methods:
```typescript
class MessageService {
  // Get or create conversation
  static async getOrCreateConversation(user1Id, user2Id)

  // Send message
  static async sendMessage(senderId, receiverId, content, type?)

  // Send locked message
  static async sendLockedMessage(senderId, receiverId, content, price, mediaUrl?)

  // Unlock message
  static async unlockMessage(userId, messageId)

  // Send tip
  static async sendTip(senderId, receiverId, amount, message?)

  // Get conversation messages
  static async getMessages(conversationId, userId, pagination)

  // Mark as read
  static async markAsRead(conversationId, userId)

  // Send message request
  static async sendMessageRequest(fromUserId, toUserId, message)

  // Accept/reject request
  static async handleMessageRequest(requestId, status)

  // Check if can message
  static async canMessage(senderId, receiverId)

  // Block user
  static async blockUser(blockerId, blockedId)

  // Get unread count
  static async getUnreadCount(userId)
}
```

## Message Flow

### Normal Message Flow:
1. User types message → MessageComposer
2. Click send → `POST /api/messages/send`
3. Check if conversation exists → Create if needed
4. Check if blocked or requires request
5. Create message record
6. Update conversation last_message
7. Increment receiver's unread_count
8. Broadcast via Supabase Realtime
9. Receiver sees message instantly

### Locked Message Flow:
1. Creator clicks "Send Locked Message"
2. Upload media (if applicable)
3. Set unlock price
4. Send → `POST /api/messages/send-locked`
5. Message appears with lock overlay for receiver
6. Receiver clicks "Unlock for X coins"
7. Check balance
8. Deduct coins from receiver
9. Credit coins to creator
10. Mark message as unlocked
11. Reveal content

### Message Request Flow:
1. Fan tries to message creator
2. Check creator settings → requires_message_request = true
3. Show message request modal
4. Fan writes introduction message
5. Submit → `POST /api/messages/request`
6. Creator sees request in /messages/requests
7. Creator accepts → conversation created
8. Creator rejects → request deleted

## Security Considerations

### Privacy:
- Users can only see their own conversations
- Blocked users cannot send messages
- Respect message request settings
- Media URLs signed with expiration

### Spam Prevention:
- Rate limiting on message sends
- Cooldown for new message requests
- Report/block functionality
- Admin moderation tools

### Content Moderation:
- Scan messages for prohibited content
- Auto-flag suspicious patterns
- Manual review queue for reports
- Auto-ban for ToS violations

## Testing Checklist

### Basic Messaging
- [ ] Send text message
- [ ] Receive message in real-time
- [ ] Read receipts update
- [ ] Typing indicators work
- [ ] Media messages (photo/video)
- [ ] Delete message
- [ ] Archive conversation

### Monetization
- [ ] Send locked message
- [ ] Unlock locked message
- [ ] Insufficient balance error
- [ ] Send tip
- [ ] Earnings tracked correctly

### Message Requests
- [ ] Request required for creator
- [ ] Send request
- [ ] Accept request → conversation created
- [ ] Reject request
- [ ] Request expires after 7 days

### Privacy
- [ ] Block user → cannot message
- [ ] Unblock user
- [ ] Mute notifications
- [ ] Archive conversation
- [ ] Settings save correctly

### Edge Cases
- [ ] New conversation creation
- [ ] Rapid message sending
- [ ] Large media files
- [ ] Offline → online sync
- [ ] Deleted user handling

## Revenue Estimates

**Example Creator Earnings:**

**Locked Messages:**
- 10 locked messages per day @ 20 coins average
- 50% unlock rate
- = 5 unlocks × 20 coins = 100 coins/day
- = 3,000 coins/month = $300

**DM Tips:**
- 20 tips per month @ 25 coins average
- = 500 coins/month = $50

**Combined:**
- ~$350/month from DMs alone
- Top creators can earn $1,000+/month from DMs

## Week 7 Tasks (Ordered)

### Part 1: Database + Backend (Day 1)
1. Create database schema (conversations, messages, requests, settings)
2. Add indexes and constraints
3. Build MessageService with core methods
4. Create all API routes
5. Test message sending/receiving

### Part 2: Real-Time Infrastructure (Day 2)
1. Set up Supabase Realtime subscriptions
2. Implement typing indicators
3. Implement read receipts
4. Test real-time message delivery
5. Add presence tracking

### Part 3: Main Inbox UI (Day 3)
1. Build MessagesInbox page
2. Create ConversationListItem component
3. Build ConversationView page
4. Create MessageBubble component
5. Build MessageComposer component
6. Add infinite scroll for messages

### Part 4: Monetization Features (Day 4)
1. Implement locked messages backend
2. Build SendLockedMessageModal
3. Build LockedMessageCard with unlock
4. Implement tipping backend
5. Build TipModal
6. Test full payment flows

### Part 5: Advanced Features (Day 5)
1. Build message requests system
2. Create MessageRequests page
3. Build MessageSettings page
4. Implement blocking/reporting
5. Add media sharing
6. Build MediaPreview component

### Part 6: Polish + Testing (Day 6)
1. Add notifications (push + email)
2. Auto-response for creators
3. Search conversations
4. Unread count badges
5. Empty states
6. Loading states
7. Error handling
8. End-to-end testing

---

**Let's build the DM goldmine!** 💬💰
