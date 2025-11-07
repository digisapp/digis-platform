# LiveKit Setup - Complete ✅

## Configuration Status

**LiveKit Cloud Project:** digis-ezio7t90
**WebSocket URL:** wss://digis-ezio7t90.livekit.cloud
**Status:** ✅ Configured and Ready

## Environment Variables

The following environment variables are configured in both local and production:

```bash
LIVEKIT_API_KEY=APIPmSJWP3YFpUx
LIVEKIT_API_SECRET=***configured***
NEXT_PUBLIC_LIVEKIT_URL=wss://digis-ezio7t90.livekit.cloud
```

## Features Enabled

### 1. Video Calls ✅
- **Route:** `/calls/[callId]`
- **Token Generation:** `/api/calls/[callId]/token`
- **Permissions:** Full audio/video/data publishing and subscribing
- **Use Case:** 1-on-1 video calls between fans and creators

### 2. Live Streaming ✅
- **Viewer Route:** `/stream/[streamId]`
- **Broadcaster Route:** `/stream/broadcast/[streamId]`
- **Token Generation:**
  - Viewer: `/api/streams/[streamId]/token` (subscribe only)
  - Broadcaster: `/api/streams/[streamId]/broadcast-token` (publish + subscribe)
- **Use Case:** Creators broadcast to multiple viewers with real-time chat and gifts

## How It Works

### Video Calls Flow:
1. Fan requests a call with creator
2. Creator accepts
3. Both parties get LiveKit tokens via `/api/calls/[callId]/token`
4. LiveKit room created with unique room name
5. Both connect to LiveKit Cloud via WebSocket
6. Video/audio streams in real-time
7. Call ends, room is destroyed

### Live Streaming Flow:
1. Creator starts stream via `/creator/go-live`
2. LiveKit room created with broadcast token
3. Creator publishes video/audio
4. Viewers join with viewer tokens (subscribe-only)
5. Real-time chat + virtual gifts via Supabase Realtime
6. Stream ends, stats saved

## Testing

### Test Video Calls:
1. Login as fan
2. Go to `/explore` and find a creator
3. Click "Request Call"
4. Login as creator (different browser/incognito)
5. Accept the call from `/calls` page
6. Both should see each other's video

### Test Live Streaming:
1. Login as creator
2. Go to `/creator/go-live`
3. Enter title and start stream
4. Allow camera/mic permissions
5. Login as fan (different browser)
6. Go to `/live` and join the stream
7. Send chat messages and gifts

## LiveKit Dashboard

Access your LiveKit dashboard at:
https://cloud.livekit.io/projects/digis-ezio7t90

Here you can:
- Monitor active rooms
- View connection logs
- Check bandwidth usage
- See participant details
- Debug connection issues

## Free Tier Limits

LiveKit Cloud free tier includes:
- Unlimited rooms
- Up to 50 concurrent participants
- 5,000 participant minutes per month
- Community support

Perfect for testing and early stage!

## Troubleshooting

### "Failed to connect to room"
- Check that NEXT_PUBLIC_LIVEKIT_URL is correct
- Verify WebSocket URL is accessible
- Check browser console for detailed errors

### "Invalid token"
- Ensure LIVEKIT_API_KEY and LIVEKIT_API_SECRET match your project
- Check that tokens are being generated correctly
- Verify environment variables are deployed to Vercel

### No video/audio
- Grant browser camera/microphone permissions
- Check that canPublish is true in token grants
- Verify LiveKit room exists and is active

## Next Steps

Now that LiveKit is configured:
1. ✅ Test video calls
2. ✅ Test live streaming
3. Consider upgrading to paid tier for higher limits
4. Set up webhooks for advanced room events (optional)

---

**Setup Date:** 2025-11-06
**Configured By:** Claude Code
**Status:** Production Ready ✅
