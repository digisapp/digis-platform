/**
 * Idempotency Tests
 *
 * Tests Redis-based idempotency key locking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Redis module
vi.mock('@/lib/redis', () => ({
  redis: {
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import { withIdempotency } from '@/lib/idempotency';
import { redis } from '@/lib/redis';

const mockRedisSet = vi.mocked(redis.set);
const mockRedisDel = vi.mocked(redis.del);

beforeEach(() => {
  mockRedisSet.mockReset();
  mockRedisDel.mockReset();
});

describe('withIdempotency', () => {
  it('executes fn and returns result when key is new', async () => {
    mockRedisSet.mockResolvedValue('OK' as any);

    const response = new Response('success', { status: 200 });
    const fn = vi.fn().mockResolvedValue(response);

    const result = await withIdempotency('test-key', 5000, fn);

    expect(mockRedisSet).toHaveBeenCalledWith('idem:test-key', '1', { nx: true, px: 5000 });
    expect(fn).toHaveBeenCalled();
    expect(result).toBe(response);
  });

  it('returns 409 Duplicate when key already exists', async () => {
    mockRedisSet.mockResolvedValue(null as any); // null = key already exists (NX failed)

    const fn = vi.fn();
    const result = await withIdempotency('duplicate-key', 5000, fn);

    expect(result.status).toBe(409);
    const body = await result.text();
    expect(body).toBe('Duplicate');

    // fn should NOT be called
    expect(fn).not.toHaveBeenCalled();
  });

  it('deletes key on fn error to allow retry', async () => {
    mockRedisSet.mockResolvedValue('OK' as any);

    const fn = vi.fn().mockRejectedValue(new Error('processing failed'));

    await expect(withIdempotency('error-key', 5000, fn)).rejects.toThrow('processing failed');

    expect(mockRedisDel).toHaveBeenCalledWith('idem:error-key');
  });

  it('does not delete key on success', async () => {
    mockRedisSet.mockResolvedValue('OK' as any);

    const fn = vi.fn().mockResolvedValue(new Response('ok'));
    await withIdempotency('success-key', 5000, fn);

    expect(mockRedisDel).not.toHaveBeenCalled();
  });

  it('uses the provided TTL', async () => {
    mockRedisSet.mockResolvedValue('OK' as any);

    const fn = vi.fn().mockResolvedValue(new Response('ok'));
    await withIdempotency('ttl-key', 30000, fn);

    expect(mockRedisSet).toHaveBeenCalledWith('idem:ttl-key', '1', { nx: true, px: 30000 });
  });

  it('prefixes key with idem:', async () => {
    mockRedisSet.mockResolvedValue('OK' as any);

    const fn = vi.fn().mockResolvedValue(new Response('ok'));
    await withIdempotency('my-operation', 5000, fn);

    expect(mockRedisSet).toHaveBeenCalledWith('idem:my-operation', '1', expect.any(Object));
  });
});
