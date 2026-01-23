import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

/**
 * Rate Limiting Configuration
 *
 * Security tiers (strictest to most generous):
 * - critical: Wallet operations, coin purchases (5/min, 30/hour)
 * - callRequest: Video call requests (3/min)
 * - strict: Auth endpoints (10/min)
 * - financial: Tips, gifts (10/min, 60/hour)
 * - moderate: General API (60/min)
 * - generous: Polling endpoints (120/min)
 */

// Different rate limiters for different use cases
const limiters = {
  // CRITICAL: Wallet/checkout operations - tightest limits
  critical: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 req/min
    analytics: true,
    prefix: 'rl:critical',
  }),
  // CRITICAL: Hourly cap for wallet operations
  criticalHourly: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'), // 30 req/hour
    analytics: true,
    prefix: 'rl:critical-hourly',
  }),
  // CRITICAL: Video/voice call requests - prevent spam
  callRequest: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 m'), // 3 calls/min
    analytics: true,
    prefix: 'rl:call-request',
  }),
  // CRITICAL: Daily call request cap
  callRequestDaily: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '24 h'), // 50 calls/day
    analytics: true,
    prefix: 'rl:call-request-daily',
  }),
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
  // Financial operations: tips, gifts (tightened from 15 to 10)
  financial: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min
    analytics: true,
    prefix: 'rl:financial',
  }),
  // Hourly financial cap (tightened from 100 to 60)
  financialHourly: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 h'), // 60 req/hour
    analytics: true,
    prefix: 'rl:financial-hourly',
  }),
};

// Map buckets to limiters
const bucketToLimiter: Record<string, keyof typeof limiters> = {
  // CRITICAL: Money operations (balance is read-only, use generous)
  'wallet:balance': 'generous',
  'wallet:checkout': 'critical',
  'wallet:purchase': 'critical',
  'stripe:checkout': 'critical',
  // CRITICAL: Call operations
  'calls:request': 'callRequest',
  'calls:initiate': 'callRequest',
  // Auth endpoints
  'auth:otp': 'strict',
  'auth:login': 'authLogin',
  'auth:signup': 'authSignup',
  'auth:check-username': 'authUsername',
  // Content upload
  'upload': 'upload',
  // Financial: tips and gifts
  'tips:quick': 'strict',
  'tips': 'financial',
  'gifts': 'financial',
  'purchases': 'financial',
  // Real-time & social endpoints
  'streams:status': 'generous',
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

/**
 * Rate limit CRITICAL operations (wallet, checkout, stripe) by user ID
 * Strictest limits: 5/min, 30/hour
 */
export async function rateLimitCritical(userId: string, operation: 'wallet' | 'checkout' | 'purchase') {
  const minuteKey = `critical:${operation}:${userId}`;
  const hourlyKey = `critical-hourly:${operation}:${userId}`;

  // Check per-minute limit (5/min)
  const minuteRes = await limiters.critical.limit(minuteKey);
  if (!minuteRes.success) {
    return {
      ok: false,
      error: 'Too many requests. Please wait before trying again.',
      retryAfter: Math.ceil((minuteRes.reset - Date.now()) / 1000),
    };
  }

  // Check hourly limit (30/hour)
  const hourlyRes = await limiters.criticalHourly.limit(hourlyKey);
  if (!hourlyRes.success) {
    return {
      ok: false,
      error: 'Hourly limit reached. Please try again later.',
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

/**
 * Rate limit call requests by user ID
 * Strict limits: 3/min, 50/day
 */
export async function rateLimitCallRequest(userId: string) {
  const minuteKey = `call-request:${userId}`;
  const dailyKey = `call-request-daily:${userId}`;

  // Check per-minute limit (3/min)
  const minuteRes = await limiters.callRequest.limit(minuteKey);
  if (!minuteRes.success) {
    return {
      ok: false,
      error: 'Too many call requests. Please wait a moment.',
      retryAfter: Math.ceil((minuteRes.reset - Date.now()) / 1000),
    };
  }

  // Check daily limit (50/day)
  const dailyRes = await limiters.callRequestDaily.limit(dailyKey);
  if (!dailyRes.success) {
    return {
      ok: false,
      error: 'Daily call request limit reached. Please try again tomorrow.',
      retryAfter: Math.ceil((dailyRes.reset - Date.now()) / 1000),
    };
  }

  return {
    ok: true,
    remaining: {
      minute: minuteRes.remaining,
      daily: dailyRes.remaining,
    },
  };
}
