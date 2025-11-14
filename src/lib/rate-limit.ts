import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// Different rate limiters for different use cases
const limiters = {
  // Very strict: auth endpoints
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min
    analytics: true,
    prefix: 'rl:strict',
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
};

// Map buckets to limiters
const bucketToLimiter: Record<string, keyof typeof limiters> = {
  'auth:otp': 'strict',
  'auth:login': 'strict',
  'tips:quick': 'strict',
  'streams:status': 'generous',
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
