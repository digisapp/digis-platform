import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// Different rate limiters for different use cases
const limiters = {
  // Very strict: auth endpoints (prevent brute force)
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min
    analytics: true,
    prefix: 'rl:strict',
  }),
  // Auth signup: prevent account creation spam
  authSignup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 signups/min per IP
    analytics: true,
    prefix: 'rl:auth-signup',
  }),
  // Auth login: prevent brute force
  authLogin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 login attempts/min
    analytics: true,
    prefix: 'rl:auth-login',
  }),
  // Username check: prevent enumeration
  authUsername: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 checks/min
    analytics: true,
    prefix: 'rl:auth-username',
  }),
  // Upload rate limiting
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 uploads/min
    analytics: true,
    prefix: 'rl:upload',
  }),
  // Moderate: general API usage
  moderate: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min
    analytics: true,
    prefix: 'rl:moderate',
  }),
  // Generous: frequently polled endpoints
  generous: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'), // 120 req/min
    analytics: true,
    prefix: 'rl:generous',
  }),
  // Financial operations: tips, gifts, purchases
  financial: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, '1 m'), // 15 req/min
    analytics: true,
    prefix: 'rl:financial',
  }),
  // Hourly financial cap
  financialHourly: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 req/hour
    analytics: true,
    prefix: 'rl:financial-hourly',
  }),
};

// Map buckets to limiters
const bucketToLimiter: Record<string, keyof typeof limiters> = {
  'auth:otp': 'strict',
  'auth:login': 'authLogin',
  'auth:signup': 'authSignup',
  'auth:check-username': 'authUsername',
  'upload': 'upload',
  'tips:quick': 'strict',
  'streams:status': 'generous',
  'tips': 'financial',
  'gifts': 'financial',
  'purchases': 'financial',
  // Real-time & social endpoints
  'ably:token': 'moderate',      // 60 req/min - token refresh
  'messages:send': 'moderate',   // 60 req/min - chat messages
  'follow': 'moderate',          // 60 req/min - follow/unfollow
  'default': 'moderate',
};

export async function rateLimit(req: Request, bucket: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${bucket}:${ip}`;

  const limiterType = bucketToLimiter[bucket] || 'moderate';
  const limiter = limiters[limiterType];

  const res = await limiter.limit(key);
  return {
    ok: res.success,
    headers: {
      'X-RateLimit-Limit': String(res.limit),
      'X-RateLimit-Remaining': String(res.remaining),
      'X-RateLimit-Reset': String(res.reset),
    },
  };
}

/**
 * Rate limit financial operations (tips, gifts, purchases) by user ID
 * Applies both per-minute and per-hour limits
 */
export async function rateLimitFinancial(userId: string, operation: 'tip' | 'gift' | 'purchase' | 'unlock') {
  const minuteKey = `financial:${operation}:${userId}`;
  const hourlyKey = `financial-hourly:${operation}:${userId}`;

  // Check per-minute limit
  const minuteRes = await limiters.financial.limit(minuteKey);
  if (!minuteRes.success) {
    return {
      ok: false,
      error: `Too many ${operation}s. Please wait a moment before trying again.`,
      retryAfter: Math.ceil((minuteRes.reset - Date.now()) / 1000),
    };
  }

  // Check hourly limit
  const hourlyRes = await limiters.financialHourly.limit(hourlyKey);
  if (!hourlyRes.success) {
    return {
      ok: false,
      error: `Hourly limit reached for ${operation}s. Please try again later.`,
      retryAfter: Math.ceil((hourlyRes.reset - Date.now()) / 1000),
    };
  }

  return {
    ok: true,
    remaining: {
      minute: minuteRes.remaining,
      hour: hourlyRes.remaining,
    },
  };
}
