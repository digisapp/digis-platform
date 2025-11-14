import { redis } from './redis';

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await redis.get<string>(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number) {
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

/** avoid thundering herd */
export async function withMiniLock<T>(key: string, fn: () => Promise<T>, ttl = 10) {
  const cacheKey = `cache:${key}`;
  const lockKey = `lock:${cacheKey}`;
  const cached = await getCached<T>(cacheKey);
  if (cached) return cached;

  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 2000 });
  if (!gotLock) {
    // brief backoff and retry cache once
    await new Promise(r => setTimeout(r, 120));
    const again = await getCached<T>(cacheKey);
    if (again) return again;
  }

  const fresh = await fn();
  await setCached(cacheKey, fresh, ttl);
  await redis.del(lockKey);
  return fresh;
}
