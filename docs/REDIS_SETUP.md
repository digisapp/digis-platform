# Upstash Redis Setup Guide

This guide covers the Upstash Redis implementation for rate limiting, caching, and idempotency in the Digis platform.

## Architecture Overview

### Core Utilities

- **`src/lib/redis.ts`** - Redis client initialization
- **`src/lib/rate-limit.ts`** - Rate limiting with configurable buckets
- **`src/lib/cache.ts`** - Hot-path caching with mini-locks (anti-thundering-herd)
- **`src/lib/idempotency.ts`** - Idempotent writes for financial operations
- **`src/lib/timeout.ts`** - Request timeout utilities

## Environment Variables

Required in `.env.local` and Vercel:

```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## Rate Limiting

### Configuration

Three rate limit tiers:

| Tier | Limit | Use Case |
|------|-------|----------|
| **Strict** | 10 req/min | Auth, tips, sensitive operations |
| **Moderate** | 60 req/min | General API usage |
| **Generous** | 120 req/min | Frequently polled endpoints |

### Bucket Mapping

```typescript
'auth:otp' → strict
'auth:login' → strict
'tips:quick' → strict
'streams:status' → generous
'default' → moderate
```

### Usage Example

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const rl = await rateLimit(req, 'streams:status');
  if (!rl.ok) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: rl.headers
    });
  }

  // ... process request
  return NextResponse.json(data, { headers: rl.headers });
}
```

## Caching

### Hot-Path Cache with Mini-Lock

Prevents thundering herd problem when many clients request the same data simultaneously.

```typescript
import { withMiniLock } from '@/lib/cache';

const data = await withMiniLock<StreamData>(
  `status:${username}`,
  async () => {
    // Expensive DB query here
    return await computeStatus(username);
  },
  10 // TTL in seconds
);
```

### Key Features

- **Lock-based**: First request gets lock, others wait briefly and check cache
- **Short TTL**: 5-10s for real-time data, 60-300s for less critical
- **JSON serialization**: Automatic serialization/deserialization

### Cache Invalidation

```typescript
import { redis } from '@/lib/redis';

// On stream start/stop
await redis.del(`cache:status:${username}`);
```

## Idempotency

### Purpose

Prevents duplicate processing of financial operations (tips, purchases) caused by:
- Double-clicks
- Network retries
- Client-side bugs

### Client Implementation

```typescript
// Client sends Idempotency-Key header with UUID
await fetch('/api/tips/quick', {
  method: 'POST',
  headers: {
    'Idempotency-Key': crypto.randomUUID(),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ amount, streamId }),
});
```

### Server Implementation

```typescript
import { withIdempotency } from '@/lib/idempotency';

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'Idempotency-Key header required' },
      { status: 400 }
    );
  }

  return await withIdempotency(`tips:${idempotencyKey}`, 60000, async () => {
    // Process payment, update DB, etc.
    return NextResponse.json({ success: true });
  });
}
```

### How It Works

1. Redis `SET NX` creates key with 60s TTL
2. If key exists → return 409 Conflict
3. If processing fails → delete key (allow retry)
4. If processing succeeds → key expires naturally after 60s

## Key Naming Conventions

Use consistent prefixes for organization:

| Prefix | Purpose | Example | TTL |
|--------|---------|---------|-----|
| `cache:` | Cached data | `cache:status:username` | 5-10s |
| `lock:` | Cache locks | `lock:cache:status:username` | 2s |
| `idem:` | Idempotency | `idem:tips:uuid` | 60s |
| `rl:` | Rate limits | `rl:strict:tips:quick:ip` | varies |
| `count:` | Aggregates | `count:tips:30d:creatorId` | 300s |

## Implementation Examples

### 1. Stream Status (Rate Limited + Cached)

✅ **File:** `src/app/api/streams/status/route.ts`

- Rate limit: 120 req/min (generous)
- Cache: 10s TTL with mini-lock
- User-specific access check NOT cached

### 2. Quick Tips (Rate Limited + Idempotent)

✅ **File:** `src/app/api/tips/quick/route.ts`

- Rate limit: 10 req/min (strict)
- Idempotency: 60s window
- Requires client-provided `Idempotency-Key`

## Best Practices

### Security

- **Never store PII** in Redis keys/values (use IDs only)
- **Set `Vary: Cookie`** on auth-dependent responses
- **Keep Redis for derived data** - source of truth is always PostgreSQL

### Performance

- **Use mini-locks** for expensive queries under load
- **Cache user-agnostic data** only (access checks stay dynamic)
- **Short TTLs** for real-time data (5-10s)
- **Longer TTLs** for stable data (60-300s)

### Reliability

- **Handle Redis failures gracefully** - don't block requests
- **Use timeouts** on Redis operations (3-5s max)
- **Monitor analytics** via Upstash dashboard

## Monitoring

### Upstash Dashboard

- Request counts per bucket
- Cache hit rates
- Rate limit violations
- Key distribution

### Application Logs

```typescript
console.log('[Redis] Cache hit:', cacheKey);
console.log('[Redis] Rate limit exceeded:', bucket, ip);
console.log('[Redis] Idempotency conflict:', idempotencyKey);
```

## Future Enhancements

### QStash Integration

For async jobs (webhooks, analytics, delayed tasks):

```typescript
import { Client } from '@upstash/qstash';

const client = new Client({ token: process.env.QSTASH_TOKEN });

await client.publishJSON({
  url: 'https://digis.cc/api/webhooks/stripe',
  body: { eventId: 'evt_123' },
  delay: 300, // 5 min delay
});
```

### Additional Rate Limit Buckets

- `content:upload` → strict (prevent spam)
- `messages:send` → moderate (DM spam protection)
- `calls:request` → strict (prevent call bombing)

## Troubleshooting

### "Too Many Requests" Errors

1. Check bucket configuration in `src/lib/rate-limit.ts`
2. Verify IP extraction: `x-forwarded-for` header
3. Test locally with different IPs

### Cache Not Updating

1. Verify invalidation logic (delete cache keys on updates)
2. Check TTL settings (may be too long)
3. Inspect Redis keys: `redis.keys('cache:*')`

### Idempotency Conflicts

1. Client should generate NEW UUID per request
2. Don't reuse keys across different operations
3. 60s window should be sufficient for retries

## Support

- [Upstash Docs](https://docs.upstash.com/redis)
- [Rate Limit Library](https://github.com/upstash/ratelimit)
- [Digis Internal Docs](./README.md)
