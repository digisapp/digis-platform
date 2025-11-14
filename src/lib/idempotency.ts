import { redis } from './redis';

export async function withIdempotency(key: string, ttlMs: number, fn: () => Promise<Response>) {
  const ok = await redis.set(`idem:${key}`, '1', { nx: true, px: ttlMs });
  if (!ok) return new Response('Duplicate', { status: 409 });
  try { return await fn(); }
  catch (e) { await redis.del(`idem:${key}`); throw e; } // allow retry if processing failed
}
