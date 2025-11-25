# VOD (Video on Demand) Save Feature

## Problem
Currently, all paid streams are automatically saved to cloud storage, which is expensive and wasteful. Most streams don't need to be saved as VODs.

## Solution
After each paid stream ends, give creators the choice to save it as a paid VOD or delete it.

---

## User Flow

### 1. Stream Ends
When a paid stream ends, show the creator a modal:

```
🎬 Stream Ended!

Your stream "Yoga Class" just finished.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Stream Stats:
   • Duration: 45 minutes
   • Peak Viewers: 23
   • Total Revenue: 1,150 coins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Save as VOD (Video on Demand)?

✅ Save as Paid VOD
   • Storage cost: ~50 coins/month
   • Set PPV price for replay access
   • Fans can purchase and rewatch anytime
   • Shows up in your Content library

❌ Don't Save (Free)
   • Recording deleted after 24 hours
   • Stream stats & revenue kept in database
   • No storage costs

[Don't Save] [Save as Paid VOD →]
```

### 2A. Creator Clicks "Save as Paid VOD"
Show pricing modal:

```
💾 Save Stream as VOD

Set replay price:
[___] coins (suggested: 50-100 coins)

Storage Cost: ~50 coins/month
(billed from your earnings)

[Cancel] [Save VOD]
```

**What happens:**
- Recording is kept in Supabase/cloud storage
- Creator sets PPV price (e.g., 50 coins)
- VOD appears in `/creator/content` as "video" type
- Fans can purchase and watch unlimited times
- Monthly storage fee (~50 coins) deducted from creator earnings

### 2B. Creator Clicks "Don't Save"
**What happens:**
- Recording is marked for deletion (deleted after 24 hours)
- Stream metadata stays in database:
  - Title, date, duration
  - Viewer count, revenue stats
  - Shows in "Ended" tab on `/creator/shows`
- No video file stored
- No storage costs

---

## Database Schema Updates

### `shows` table
Add new columns:
```sql
ALTER TABLE shows ADD COLUMN recording_url TEXT;
ALTER TABLE shows ADD COLUMN saved_as_vod BOOLEAN DEFAULT FALSE;
ALTER TABLE shows ADD COLUMN vod_price INTEGER;
ALTER TABLE shows ADD COLUMN recording_expires_at TIMESTAMP;
```

### Workflow:
1. Stream ends → `recording_url` populated by LiveKit
2. `recording_expires_at` set to now + 24 hours
3. Creator chooses:
   - **Save VOD**: Set `saved_as_vod = true`, create `content` record
   - **Don't Save**: Keep default, recording auto-deleted at expiry

---

## API Endpoints

### POST `/api/shows/[showId]/save-vod`
```typescript
{
  vodPrice: number; // Coins to watch replay
}
```

**Response:**
```typescript
{
  success: true,
  content: {
    id: string,
    type: 'video',
    unlockPrice: number
  }
}
```

**Actions:**
1. Update `shows.saved_as_vod = true`
2. Update `shows.vod_price = vodPrice`
3. Clear `shows.recording_expires_at`
4. Create `content` record:
   - `type = 'video'`
   - `media_url = shows.recording_url`
   - `unlock_price = vodPrice`
   - `title = shows.title`
5. Return content ID

### POST `/api/shows/[showId]/delete-recording`
```typescript
// No body needed
```

**Response:**
```typescript
{ success: true }
```

**Actions:**
1. Mark recording for immediate deletion
2. Update `recording_expires_at = NOW()`
3. Background job deletes file from storage

---

## Cron Job: Auto-Delete Expired Recordings

**Vercel Cron (daily at 3am):**
`/api/cron/delete-expired-recordings`

```typescript
// Find all recordings past expiry that haven't been saved as VOD
const expiredRecordings = await db
  .select()
  .from(shows)
  .where(
    and(
      isNotNull(shows.recordingUrl),
      eq(shows.savedAsVod, false),
      lt(shows.recordingExpiresAt, new Date())
    )
  );

// Delete from Supabase storage
for (const show of expiredRecordings) {
  await supabase.storage
    .from('stream-recordings')
    .remove([extractPathFromUrl(show.recordingUrl)]);

  // Clear recording_url in database
  await db
    .update(shows)
    .set({ recordingUrl: null })
    .where(eq(shows.id, show.id));
}
```

---

## Storage Costs

### Calculation:
- Average stream: 1 hour = ~500MB - 1GB video
- Supabase storage: $0.021/GB/month
- Cost per VOD: ~$0.02 - $0.05/month
- In coins: ~50 coins/month (at $0.001/coin)

### Billing:
- Monthly cron job calculates storage fees
- Deduct from creator's earnings balance
- If balance insufficient, send notification
- Option: Auto-delete VOD if unpaid after 30 days

---

## UI Components Needed

### 1. `PostStreamModal.tsx`
Modal shown when stream ends with stats and save/delete options.

### 2. `VODPricingModal.tsx`
Modal for setting VOD replay price.

### 3. Update `/creator/shows` Ended tab
- Show "Saved as VOD" badge if `saved_as_vod = true`
- Show "Recording deleted" if no recording_url
- Add "View VOD" button linking to `/creator/content/[id]`

---

## Implementation Phases

### Phase 1: Basic Flow (MVP)
- [ ] Add database columns
- [ ] Create PostStreamModal component
- [ ] Create VODPricingModal component
- [ ] Implement `/api/shows/[showId]/save-vod` endpoint
- [ ] Implement `/api/shows/[showId]/delete-recording` endpoint
- [ ] Show modal when stream ends (integrate with LiveKit webhook)

### Phase 2: Automation
- [ ] Create cron job for auto-deletion
- [ ] Set up Vercel cron schedule
- [ ] Test auto-deletion after 24 hours

### Phase 3: Billing
- [ ] Calculate monthly storage costs
- [ ] Deduct from creator earnings
- [ ] Send notifications for insufficient balance
- [ ] Add storage cost to creator dashboard

### Phase 4: UX Polish
- [ ] Add "expires in X hours" countdown in Ended tab
- [ ] Allow re-saving if within 24 hours
- [ ] Show storage costs in creator analytics

---

## Notes
- Default behavior: **Don't save** (to minimize costs)
- 24-hour grace period allows creators to change their mind
- Storage costs are transparent and opt-in
- VODs appear in Content library like regular uploaded videos
- Fans purchase VODs same as regular locked content
