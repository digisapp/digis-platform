# Streaming API Reference

All streaming-related API endpoints for Week 4 implementation.

## Stream Management

### Create Stream
```
POST /api/streams/create
```
**Auth Required:** Yes
**Body:**
```json
{
  "title": "My Live Stream",
  "description": "Optional description"
}
```
**Response:**
```json
{
  "stream": {
    "id": "uuid",
    "creatorId": "uuid",
    "title": "My Live Stream",
    "status": "live",
    "roomName": "stream_uuid",
    "currentViewers": 0,
    "peakViewers": 0,
    "startedAt": "2025-01-01T00:00:00Z"
  }
}
```

### End Stream
```
POST /api/streams/[streamId]/end
```
**Auth Required:** Yes (Creator only)
**Response:**
```json
{
  "stream": {
    "id": "uuid",
    "status": "ended",
    "endedAt": "2025-01-01T01:00:00Z",
    "durationSeconds": 3600,
    "totalGiftsReceived": 150
  }
}
```

### Get Stream Details
```
GET /api/streams/[streamId]
```
**Auth Required:** No
**Response:**
```json
{
  "stream": {
    "id": "uuid",
    "title": "Stream Title",
    "status": "live",
    "currentViewers": 45,
    "creator": {
      "id": "uuid",
      "username": "creator_name",
      "displayName": "Creator Name"
    }
  }
}
```

### Get Live Streams
```
GET /api/streams/live
```
**Auth Required:** No
**Response:**
```json
{
  "streams": [
    {
      "id": "uuid",
      "title": "Stream 1",
      "currentViewers": 100,
      "creator": {...}
    }
  ]
}
```

## Viewer Management

### Join Stream
```
POST /api/streams/[streamId]/join
```
**Auth Required:** Yes
**Response:**
```json
{
  "viewer": {
    "id": "uuid",
    "streamId": "uuid",
    "userId": "uuid",
    "username": "viewer_name",
    "joinedAt": "2025-01-01T00:00:00Z"
  }
}
```

### Leave Stream
```
POST /api/streams/[streamId]/leave
```
**Auth Required:** Yes
**Response:**
```json
{
  "success": true
}
```

### Get Current Viewers
```
GET /api/streams/[streamId]/viewers
```
**Auth Required:** No
**Response:**
```json
{
  "viewers": [
    {
      "id": "uuid",
      "username": "viewer1",
      "joinedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Chat

### Send Message
```
POST /api/streams/[streamId]/message
```
**Auth Required:** Yes
**Body:**
```json
{
  "message": "Hello everyone!"
}
```
**Response:**
```json
{
  "message": {
    "id": "uuid",
    "streamId": "uuid",
    "userId": "uuid",
    "username": "viewer1",
    "message": "Hello everyone!",
    "messageType": "chat",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### Get Messages
```
GET /api/streams/[streamId]/messages?limit=100
```
**Auth Required:** No
**Query Params:**
- `limit` (optional, default: 100)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "username": "viewer1",
      "message": "Hello!",
      "messageType": "chat",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Virtual Gifts

### Send Gift
```
POST /api/streams/[streamId]/gift
```
**Auth Required:** Yes
**Body:**
```json
{
  "giftId": "uuid",
  "quantity": 5
}
```
**Response:**
```json
{
  "streamGift": {
    "id": "uuid",
    "giftId": "uuid",
    "quantity": 5,
    "totalCoins": 50
  },
  "gift": {
    "id": "uuid",
    "name": "Star",
    "emoji": "⭐",
    "coinCost": 10,
    "animationType": "burst",
    "rarity": "rare"
  }
}
```

### Get Gift Leaderboard
```
GET /api/streams/[streamId]/leaderboard?limit=10
```
**Auth Required:** No
**Query Params:**
- `limit` (optional, default: 10)

**Response:**
```json
{
  "leaderboard": [
    {
      "senderUsername": "bigfan",
      "senderId": "uuid",
      "totalCoins": 500
    }
  ]
}
```

### Get All Gifts
```
GET /api/gifts
```
**Auth Required:** No
**Response:**
```json
{
  "gifts": [
    {
      "id": "uuid",
      "name": "Rose",
      "emoji": "🌹",
      "coinCost": 1,
      "animationType": "float",
      "rarity": "common"
    },
    {
      "id": "uuid",
      "name": "Diamond",
      "emoji": "💎",
      "coinCost": 20,
      "animationType": "burst",
      "rarity": "epic"
    }
  ]
}
```

## LiveKit Tokens

### Get Viewer Token
```
GET /api/streams/[streamId]/token
```
**Auth Required:** Yes
**Response:**
```json
{
  "token": "eyJhbGc...",
  "roomName": "stream_uuid",
  "serverUrl": "wss://livekit.example.com"
}
```

### Get Broadcast Token
```
GET /api/streams/[streamId]/broadcast-token
```
**Auth Required:** Yes (Creator only)
**Response:**
```json
{
  "token": "eyJhbGc...",
  "roomName": "stream_uuid",
  "serverUrl": "wss://livekit.example.com"
}
```

## Error Responses

All endpoints may return these error statuses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Only the creator can broadcast"
}
```

**404 Not Found:**
```json
{
  "error": "Stream not found"
}
```

**400 Bad Request:**
```json
{
  "error": "Stream is not live"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create stream"
}
```

## Available Virtual Gifts

| Emoji | Name | Cost | Rarity | Animation |
|-------|------|------|--------|-----------|
| 🌹 | Rose | 1 | common | float |
| ❤️ | Heart | 2 | common | float |
| ⭐ | Star | 5 | rare | burst |
| 🔥 | Fire | 10 | rare | burst |
| 💎 | Diamond | 20 | epic | burst |
| 🚀 | Rocket | 50 | epic | fireworks |
| 👑 | Crown | 100 | legendary | fireworks |
| 🏰 | Mansion | 500 | legendary | confetti |
