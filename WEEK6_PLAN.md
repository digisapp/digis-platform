# Week 6: Ticketed Shows/Events - Implementation Plan

## Goal
Build a ticketed event system where creators can host exclusive live shows that fans purchase tickets to attend.

## Exit Criteria
- [x] Creators can create ticketed shows
- [x] Fans can browse upcoming shows
- [x] Fans can purchase tickets with coins
- [x] Only ticket holders can join the live stream
- [x] Ticket sales tracked and credited to creator
- [x] Show calendar with upcoming events
- [x] Reminder notifications before show starts

## Business Model

**Creator Revenue Example:**
- Host a show with 100 tickets @ 50 coins each
- 80 tickets sold = 4,000 coins revenue
- At $0.10/coin = $400 per show
- Platform takes 20% = Creator gets $320

**High-Value Shows:**
- Exclusive Q&A sessions
- Private performances
- Behind-the-scenes access
- Masterclass/workshops
- Meet & greets

## Database Schema

### 1. Shows Table
```sql
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) NOT NULL,

  -- Show Details
  title TEXT NOT NULL,
  description TEXT,
  show_type TEXT DEFAULT 'live_show' CHECK (show_type IN ('live_show', 'qna', 'workshop', 'meetgreet', 'performance')),

  -- Ticketing
  ticket_price INTEGER NOT NULL, -- In coins
  max_tickets INTEGER, -- NULL = unlimited
  tickets_sold INTEGER DEFAULT 0,

  -- Access Control
  is_private BOOLEAN DEFAULT false, -- Invite-only shows
  requires_approval BOOLEAN DEFAULT false,

  -- Timing
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP,
  actual_start TIMESTAMP,
  actual_end TIMESTAMP,
  duration_minutes INTEGER DEFAULT 60,

  -- LiveKit Integration
  room_name TEXT UNIQUE,
  stream_id UUID REFERENCES streams(id), -- Links to active stream when live

  -- Media
  cover_image_url TEXT,
  trailer_url TEXT,

  -- Revenue
  total_revenue INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),

  -- Metadata
  tags TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shows_creator ON shows(creator_id, scheduled_start DESC);
CREATE INDEX idx_shows_upcoming ON shows(status, scheduled_start) WHERE status = 'scheduled';
CREATE INDEX idx_shows_live ON shows(status) WHERE status = 'live';
```

### 2. Show Tickets Table
```sql
CREATE TABLE show_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES shows(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Purchase
  ticket_number INTEGER, -- Sequential per show
  coins_paid INTEGER NOT NULL,
  transaction_id UUID REFERENCES wallet_transactions(id),

  -- Status
  is_valid BOOLEAN DEFAULT true, -- Can be revoked
  check_in_time TIMESTAMP, -- When user joined the show

  purchased_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(show_id, user_id) -- One ticket per show per user
);

CREATE INDEX idx_tickets_show ON show_tickets(show_id);
CREATE INDEX idx_tickets_user ON show_tickets(user_id, purchased_at DESC);
CREATE INDEX idx_tickets_checkin ON show_tickets(show_id, check_in_time);
```

### 3. Show Reminders Table (Optional)
```sql
CREATE TABLE show_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Reminder Settings
  remind_before_minutes INTEGER DEFAULT 15, -- 15 min before show
  reminded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(show_id, user_id)
);
```

## API Routes

### Show Management (Creators)
- `POST /api/shows/create` - Create new show
- `GET /api/shows/creator` - Get creator's shows
- `PATCH /api/shows/[showId]` - Update show details
- `DELETE /api/shows/[showId]` - Cancel show
- `POST /api/shows/[showId]/start` - Start the live show
- `POST /api/shows/[showId]/end` - End the show
- `GET /api/shows/[showId]/attendees` - Get ticket holders list
- `GET /api/shows/[showId]/stats` - Revenue and attendance stats

### Show Discovery (Fans)
- `GET /api/shows/upcoming` - Browse upcoming shows
- `GET /api/shows/[showId]` - Get show details
- `POST /api/shows/[showId]/purchase` - Buy ticket
- `GET /api/shows/my-tickets` - User's purchased tickets
- `POST /api/shows/[showId]/join` - Join live show (check ticket)
- `POST /api/shows/[showId]/remind-me` - Set reminder

### Admin
- `GET /api/admin/shows` - All shows (moderation)

## Frontend Pages

### Creator Side

1. **ShowsCalendar** (`/creator/shows`)
   - Calendar view of scheduled shows
   - Create show button
   - Quick stats (tickets sold, revenue)
   - Edit/cancel shows

2. **CreateShowModal**
   - Show title, description
   - Date/time picker
   - Ticket price input
   - Max tickets (optional)
   - Cover image upload
   - Show type selector
   - Publish button

3. **ShowManagement** (`/creator/shows/[showId]`)
   - Show details
   - Ticket sales progress bar
   - Attendee list
   - Start show button (goes live)
   - Chat with ticket holders
   - Revenue breakdown

### Fan Side

4. **ShowsDirectory** (`/shows`)
   - Grid of upcoming shows
   - Filter by creator/type/date
   - Featured shows
   - Sort by: date, popularity, price

5. **ShowDetail** (`/shows/[showId]`)
   - Show information
   - Creator profile
   - Ticket price and availability
   - Purchase ticket button
   - Add to calendar button
   - Set reminder toggle

6. **MyTickets** (`/shows/my-tickets`)
   - Upcoming shows user has tickets for
   - Past shows attended
   - Join show button (when live)
   - Download ticket/receipt

### Shared Components

7. **ShowCard**
   - Cover image
   - Show title, creator
   - Date/time (with countdown)
   - Ticket price
   - Sold out badge
   - Live badge (if streaming)

8. **TicketPurchaseModal**
   - Show preview
   - Ticket details
   - Total cost
   - Confirm purchase
   - Add to calendar option

9. **ShowCountdown**
   - Time until show starts
   - Animated countdown
   - Join button (appears when live)

## Show Service (`src/lib/shows/show-service.ts`)

### Key Methods:
```typescript
class ShowService {
  // Create show
  static async createShow(creatorId, showData)

  // Purchase ticket
  static async purchaseTicket(userId, showId)

  // Check if user has ticket
  static async hasTicket(userId, showId)

  // Verify ticket to join live stream
  static async verifyAccess(userId, showId)

  // Get upcoming shows
  static async getUpcomingShows(filters, pagination)

  // Get user's tickets
  static async getUserTickets(userId)

  // Start show (create LiveKit room)
  static async startShow(showId, creatorId)

  // End show and finalize stats
  static async endShow(showId)

  // Check-in attendee
  static async checkInAttendee(userId, showId)
}
```

## Ticket Purchase Flow

1. **Fan clicks "Buy Ticket for X coins"**
2. Check if show is sold out
3. Check if user already has ticket → Error
4. Check balance → Show error if insufficient
5. Create ticket record
6. Deduct coins from user → wallet transaction
7. Credit coins to creator → wallet transaction
8. Update show stats (tickets_sold, total_revenue)
9. Send confirmation → "Ticket purchased!"
10. Optionally: Add to calendar, set reminder

## Show Start Flow

1. **Creator clicks "Start Show"**
2. Create LiveKit room
3. Create associated stream record
4. Update show status to 'live'
5. Send notifications to ticket holders
6. Creator joins as host
7. Ticket holders can join

## Access Control

**Before joining stream, verify:**
```typescript
// Check ticket ownership
const hasTicket = await ShowService.hasTicket(userId, showId)
if (!hasTicket) {
  return { error: 'No ticket for this show' }
}

// Check show is live
const show = await db.query.shows.findFirst({ where: eq(shows.id, showId) })
if (show.status !== 'live') {
  return { error: 'Show has not started yet' }
}

// Grant access to LiveKit room
const token = await createLiveKitToken(userId, show.room_name)
return { token, roomName: show.room_name }
```

## Notifications

**When to notify ticket holders:**
- 1 hour before show starts
- 15 minutes before show starts
- When show goes live (immediate)
- If show is cancelled (refund issued)

## Revenue Model

**Platform Economics:**
- Creator sets ticket price (10-100+ coins)
- Platform takes 20% commission
- 80% goes to creator's wallet
- Instant payout (no hold period)

**Example Show:**
- 50-coin tickets
- 100 tickets sold
- = 5,000 coins revenue
- Platform: 1,000 coins ($100)
- Creator: 4,000 coins ($400)

## Week 6 Tasks (Ordered)

### Part 1: Database + Backend (Today)
1. Create database schema
2. Build ShowService
3. Create show management APIs
4. Create ticket purchase API
5. Build access verification

### Part 2: Creator Tools (Day 2)
1. Shows calendar page
2. Create show modal
3. Show management page
4. Start/end show controls
5. Attendee list

### Part 3: Fan Experience (Day 3)
1. Shows directory/feed
2. Show detail page
3. Ticket purchase flow
4. My tickets page
5. Join show button

### Part 4: Polish (Day 4)
1. Calendar integration
2. Reminder system
3. Countdown timers
4. Sold out badges
5. Revenue dashboard for creators

---

**Let's build the ticketing goldmine!** 🎟️💰
