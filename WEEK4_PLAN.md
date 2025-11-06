# Week 4: Live Streaming - Implementation Plan

## Goal
Build multi-viewer live streaming with real-time chat, virtual gifts, and viewer tracking.

## Exit Criteria
- [ ] Creator can start a live stream
- [ ] Multiple fans can watch simultaneously
- [ ] Real-time chat works for all viewers
- [ ] Fans can send virtual gifts during stream
- [ ] Gifts trigger animations for all viewers
- [ ] Viewer count updates in real-time
- [ ] Stream automatically ends and saves stats

## Database Schema

### 1. Streams Table
```sql
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'ended')),

  -- LiveKit Integration
  room_name TEXT UNIQUE NOT NULL,
  stream_key TEXT UNIQUE,

  -- Viewer Tracking
  current_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,

  -- Revenue
  total_gifts_received INTEGER DEFAULT 0, -- In coins

  -- Timing
  scheduled_for TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,

  -- Metadata
  thumbnail_url TEXT,
  tags TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_streams_creator ON streams(creator_id);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_streams_started ON streams(started_at DESC);
```

### 2. Stream Messages Table (Chat)
```sql
CREATE TABLE stream_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'gift')),

  -- For gift messages
  gift_id UUID REFERENCES virtual_gifts(id),
  gift_amount INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stream_messages_stream ON stream_messages(stream_id, created_at DESC);
```

### 3. Virtual Gifts Table
```sql
CREATE TABLE virtual_gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL, -- 🌹, 💎, 🎁, ⭐, 🔥
  coin_cost INTEGER NOT NULL,
  animation_type TEXT NOT NULL, -- 'float', 'burst', 'confetti', 'fireworks'
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data
INSERT INTO virtual_gifts (name, emoji, coin_cost, animation_type, rarity) VALUES
  ('Rose', '🌹', 1, 'float', 'common'),
  ('Heart', '❤️', 2, 'float', 'common'),
  ('Star', '⭐', 5, 'burst', 'rare'),
  ('Diamond', '💎', 10, 'burst', 'epic'),
  ('Rocket', '🚀', 20, 'fireworks', 'epic'),
  ('Crown', '👑', 50, 'fireworks', 'legendary'),
  ('Mansion', '🏰', 100, 'confetti', 'legendary');
```

### 4. Stream Gifts Table (Transactions)
```sql
CREATE TABLE stream_gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id),
  sender_id UUID REFERENCES users(id),
  gift_id UUID REFERENCES virtual_gifts(id),
  quantity INTEGER DEFAULT 1,
  total_coins INTEGER NOT NULL,

  -- For leaderboard
  sender_username TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stream_gifts_stream ON stream_gifts(stream_id, created_at DESC);
CREATE INDEX idx_stream_gifts_sender ON stream_gifts(sender_id);
```

### 5. Stream Viewers Table (Active tracking)
```sql
CREATE TABLE stream_viewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  username TEXT NOT NULL,

  joined_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(stream_id, user_id)
);

CREATE INDEX idx_stream_viewers_stream ON stream_viewers(stream_id, last_seen_at DESC);
```

## API Routes

### Stream Management
- `POST /api/streams/create` - Create and start stream
- `POST /api/streams/[streamId]/end` - End stream
- `GET /api/streams/[streamId]` - Get stream details
- `GET /api/streams/live` - Get all live streams
- `GET /api/streams/creator/[creatorId]` - Get creator's streams

### LiveKit Integration
- `GET /api/streams/[streamId]/token` - Get viewer token
- `GET /api/streams/[streamId]/broadcast-token` - Get creator broadcast token

### Chat
- `POST /api/streams/[streamId]/message` - Send chat message
- `GET /api/streams/[streamId]/messages` - Get chat history

### Gifts
- `POST /api/streams/[streamId]/gift` - Send virtual gift
- `GET /api/streams/[streamId]/leaderboard` - Get gift leaderboard
- `GET /api/gifts` - Get all available gifts

### Viewers
- `POST /api/streams/[streamId]/join` - Join stream as viewer
- `POST /api/streams/[streamId]/leave` - Leave stream
- `GET /api/streams/[streamId]/viewers` - Get current viewers

## Frontend Components

### Creator Side
1. **StreamSetup Component** (`/creator/go-live`)
   - Title and description input
   - Thumbnail upload
   - Tags selection
   - "Go Live" button

2. **BroadcastStudio Component** (`/stream/broadcast/[streamId]`)
   - LiveKit video preview (creator camera)
   - Real-time viewer count
   - Live chat sidebar
   - Gift notifications
   - Stream controls (end stream, mute, etc.)
   - Earnings counter

### Viewer Side
3. **StreamViewer Component** (`/stream/[streamId]`)
   - LiveKit video player (creator's stream)
   - Real-time chat
   - Send gifts interface
   - Viewer count
   - Gift leaderboard

4. **LiveStreams List** (`/live`)
   - Grid of live streams
   - Thumbnail, title, viewer count
   - Creator info
   - Click to watch

### Shared Components
5. **ChatBox Component**
   - Scrollable message list
   - Message input
   - System messages (user joined, gift sent)
   - Gift animations

6. **GiftSelector Component**
   - Grid of available gifts
   - Shows coin cost
   - Quantity selector
   - Preview animation

7. **GiftAnimation Component**
   - Renders gift animations
   - Types: float, burst, confetti, fireworks
   - Auto-removes after animation

## Real-Time Features (Socket.io or Supabase Realtime)

### Events to Broadcast:
- `viewer:joined` - New viewer joined
- `viewer:left` - Viewer left
- `viewer:count` - Update viewer count
- `chat:message` - New chat message
- `gift:sent` - Gift animation trigger
- `stream:ended` - Stream ended by creator

## LiveKit Setup

### Stream Configuration
```typescript
// Creator broadcasts video/audio
const creatorOptions = {
  audio: true,
  video: true,
  publish: true,
  subscribe: false, // Creator doesn't subscribe to viewers
};

// Viewers watch only
const viewerOptions = {
  audio: false,
  video: false,
  publish: false,
  subscribe: true, // Subscribe to creator's stream
};
```

## Gift Animation Logic

### CSS Animations
```css
@keyframes float-up {
  from {
    transform: translateY(0) scale(0.5);
    opacity: 0;
  }
  to {
    transform: translateY(-200px) scale(1.5);
    opacity: 0;
  }
}

@keyframes burst {
  0% { transform: scale(0) rotate(0deg); }
  50% { transform: scale(1.5) rotate(180deg); }
  100% { transform: scale(0) rotate(360deg); }
}

@keyframes fireworks {
  /* Complex particle explosion */
}
```

## Stream Service (`src/lib/streams/stream-service.ts`)

### Key Methods:
```typescript
class StreamService {
  // Create and start stream
  static async createStream(creatorId, title, description)

  // End stream and save stats
  static async endStream(streamId)

  // Join as viewer
  static async joinStream(streamId, userId)

  // Leave stream
  static async leaveStream(streamId, userId)

  // Update viewer count
  static async updateViewerCount(streamId)

  // Send gift
  static async sendGift(streamId, senderId, giftId, quantity)

  // Get leaderboard
  static async getGiftLeaderboard(streamId, limit = 10)
}
```

## Testing Checklist

### Local Testing
- [ ] Creator can start stream with camera/mic
- [ ] Viewer can watch in another browser tab
- [ ] Chat messages appear for both
- [ ] Gifts trigger animations
- [ ] Viewer count increments/decrements
- [ ] Stream ends properly

### Production Testing
- [ ] Multiple viewers from different devices
- [ ] Chat with 10+ concurrent users
- [ ] Gift animations sync across viewers
- [ ] Stream quality (720p minimum)
- [ ] Network issues handling

## Week 4 Tasks (Ordered)

### Day 1: Database + Backend
1. Create database migrations
2. Seed virtual gifts
3. Build StreamService
4. Create all API routes

### Day 2: LiveKit Integration
1. Set up LiveKit streaming config
2. Create broadcast tokens
3. Create viewer tokens
4. Test video streaming

### Day 3: Chat + Real-time
1. Set up WebSocket/Supabase Realtime
2. Build chat functionality
3. Implement viewer tracking
4. Test real-time updates

### Day 4: Gifts + Animations
1. Build gift selection UI
2. Implement gift animations
3. Create gift transaction logic
4. Build leaderboard

### Day 5: Polish + Testing
1. Create StreamSetup UI
2. Build BroadcastStudio
3. Build StreamViewer
4. Build LiveStreams list
5. End-to-end testing

## Cost Estimate

**LiveKit Streaming:**
- Video: ~10MB per minute per viewer
- 1 stream with 100 viewers for 1 hour = 60GB
- Cost: ~$180/month for 1TB egress (handles ~15 hours of 100-viewer streams)

**Alternative: Use Agora (already have credentials)**
- Cheaper for high viewer counts
- Built-in CDN
- Better for Asia-Pacific region

---

**Ready to start Week 4?** This is where it gets really exciting! 🎥✨
