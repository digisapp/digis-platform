# Live Streaming Testing Guide

Server running at: **http://localhost:3001**

## Quick Test Flow

### 1. Login / Create Account
1. Go to http://localhost:3001
2. Click "Sign Up" or "Login"
3. Use existing credentials or create new account

### 2. Test Streaming as Creator

#### Start a Stream:
1. Go to http://localhost:3001/creator/go-live
2. Enter stream title (e.g., "Test Stream")
3. Enter description (optional)
4. Click "Start Streaming"
5. **Allow camera/microphone permissions when prompted**

**Expected Result:**
- Redirects to `/stream/broadcast/[streamId]`
- You see yourself on camera
- Top bar shows: LIVE badge, viewer count (0), earnings (0)
- Chat is visible on the right
- Stream controls visible

#### What to Check:
- ✅ Camera preview working?
- ✅ Stream stats showing?
- ✅ Chat interface visible?
- ✅ Can you end the stream?

### 3. Test Watching as Viewer

#### Join the Stream:
1. **Copy the stream ID** from the URL (e.g., `/stream/broadcast/abc-123-def`)
2. Open **incognito/private window** or **different browser**
3. Login with different account
4. Go to http://localhost:3001/live
5. You should see your test stream in the grid
6. Click to watch

**Alternative:** Directly go to `http://localhost:3001/stream/[streamId]`

**Expected Result:**
- You see the creator's video
- Viewer count increases to 1
- Chat is available
- Gift selector button visible
- Leaderboard (if gifts sent)

#### What to Check:
- ✅ Video playing?
- ✅ Viewer count updated?
- ✅ Can send chat messages?
- ✅ Messages appear for both creator and viewer?

### 4. Test Virtual Gifts

**Requirements:**
- Viewer needs coins in wallet
- Go to http://localhost:3001/wallet to buy coins first

#### Send a Gift:
1. As viewer, click "Send Gift" button
2. Select a gift (e.g., 🌹 Rose = 1 coin)
3. Set quantity
4. Click "Send"

**Expected Result:**
- Gift animation appears on screen (for both creator and viewer!)
- Creator's earnings increase
- Chat shows system message
- Leaderboard updates
- Balance deducts from viewer

#### Test Different Gifts:
- 🌹 Rose (1 coin) - Float animation
- ⭐ Star (5 coins) - Burst animation
- 💎 Diamond (20 coins) - Burst animation
- 🚀 Rocket (50 coins) - Fireworks animation
- 🏰 Mansion (500 coins) - Confetti animation

### 5. Test Real-Time Features

**Open Multiple Windows:**
- Window 1: Creator broadcasting
- Window 2: Viewer watching
- Window 3: Another viewer watching (optional)

**Test Sync:**
1. Send chat message from viewer → Should appear instantly for creator
2. Send gift from viewer → Animation should play for everyone
3. Join/leave as viewer → Viewer count should update everywhere
4. End stream as creator → All viewers should be redirected

### 6. Test Live Streams Page

1. Go to http://localhost:3001/live
2. Start multiple streams (different accounts)
3. Check:
   - ✅ All live streams appear?
   - ✅ Viewer counts accurate?
   - ✅ Can click to watch any stream?
   - ✅ Auto-refreshes every 10 seconds?

## Test Scenarios

### Scenario 1: Full Creator Experience
1. Go live as creator
2. Stream for 2-3 minutes
3. Receive gifts from viewers
4. Read and respond to chat
5. End stream
6. Check earnings increased

### Scenario 2: Full Fan Experience
1. Browse live streams
2. Join a stream
3. Chat with other viewers
4. Send virtual gifts
5. Check leaderboard position
6. Leave stream

### Scenario 3: Multi-Viewer Test
1. Creator starts stream
2. Viewer 1 joins (opens in Chrome)
3. Viewer 2 joins (opens in Firefox/Safari)
4. Viewer 3 joins (opens in incognito)
5. All send chat messages
6. All should see each other's messages
7. Send gift - all should see animation

## Troubleshooting

### Camera/Mic Not Working
- Check browser permissions
- Try Chrome/Firefox (best support)
- Allow permissions when prompted

### "Not authorized" Errors
- Make sure you're logged in
- Check user role (creator vs fan)
- Try logging out and back in

### Stream Not Appearing in /live
- Refresh the page
- Check stream status is "live"
- Wait 10 seconds for auto-refresh

### Real-Time Updates Not Working
- Check console for errors
- Make sure Supabase Realtime is enabled
- Try refreshing the page

### Gifts Not Sending
- Check wallet balance
- Make sure you have enough coins
- Go to /wallet to purchase coins

## Database Check

To verify data is being saved:

```bash
# Check streams
psql $DATABASE_URL -c "SELECT id, title, status, current_viewers FROM streams;"

# Check messages
psql $DATABASE_URL -c "SELECT * FROM stream_messages ORDER BY created_at DESC LIMIT 10;"

# Check gifts
psql $DATABASE_URL -c "SELECT * FROM stream_gifts ORDER BY created_at DESC LIMIT 5;"

# Check viewers
psql $DATABASE_URL -c "SELECT * FROM stream_viewers;"
```

## API Testing

Test endpoints directly:

```bash
# Get all live streams
curl http://localhost:3001/api/streams/live

# Get available gifts
curl http://localhost:3001/api/gifts

# Create stream (requires auth)
curl -X POST http://localhost:3001/api/streams/create \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test Stream","description":"Testing"}'
```

## Success Criteria

### ✅ Streaming Works:
- [ ] Creator can start stream with camera
- [ ] Viewers can watch stream
- [ ] Video quality is acceptable
- [ ] Audio is clear

### ✅ Real-Time Works:
- [ ] Chat messages sync instantly
- [ ] Viewer count updates live
- [ ] Gifts trigger animations for all
- [ ] Join/leave events broadcast

### ✅ Wallet Works:
- [ ] Gifts deduct coins from sender
- [ ] Gifts credit coins to creator
- [ ] Balance updates immediately
- [ ] Leaderboard accurate

### ✅ UI Works:
- [ ] All pages load correctly
- [ ] Buttons respond
- [ ] Animations play
- [ ] No console errors

## Known Issues

None currently! If you find any, document them here.

## Next Steps After Testing

1. Test on production (deploy)
2. Test with real users
3. Monitor performance
4. Gather feedback
5. Fix any bugs found
6. Move to Week 5 (Messaging System)

---

**Ready to test!** Open http://localhost:3001 and start streaming! 🎥✨
