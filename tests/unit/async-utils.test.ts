/**
 * Async Utility Tests
 *
 * Tests timeout, retry, and combined timeout+retry logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTimeout, withRetry, withTimeoutAndRetry } from '@/lib/async-utils';

beforeEach(() => {
  vi.useFakeTimers();
});

describe('withTimeout', () => {
  it('resolves if promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000, 'test');
    expect(result).toBe('ok');
  });

  it('rejects if promise takes longer than timeout', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('slow'), 10000);
    });

    const promise = withTimeout(slowPromise, 100, 'slow-op');

    // Advance past the timeout
    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow('slow-op timeout after 100ms');
  });

  it('uses default timeout of 5000ms', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('slow'), 10000);
    });

    const promise = withTimeout(slowPromise);

    vi.advanceTimersByTime(5100);

    await expect(promise).rejects.toThrow('timeout after 5000ms');
  });

  it('uses default tag of "operation"', async () => {
    const slowPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('slow'), 10000);
    });

    const promise = withTimeout(slowPromise, 100);

    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow('operation timeout');
  });

  it('clears timeout after promise resolves', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    await withTimeout(Promise.resolve('ok'), 5000, 'test');

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('propagates promise rejection', async () => {
    const failPromise = Promise.reject(new Error('original error'));

    await expect(withTimeout(failPromise, 5000, 'test')).rejects.toThrow('original error');
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 2, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, 2, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws last error after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent error'));

    await expect(withRetry(fn, 2, 10)).rejects.toThrow('persistent error');
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('retries exactly the specified number of times', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(withRetry(fn, 0, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1); // 0 retries = 1 attempt

    fn.mockClear();
    await expect(withRetry(fn, 1, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2); // 1 retry = 2 attempts
  });

  it('succeeds on last retry attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, 2, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('withTimeoutAndRetry', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('returns result when fn succeeds within timeout', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withTimeoutAndRetry(fn, { timeoutMs: 1000, retries: 2, tag: 'test' });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on fn failure', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withTimeoutAndRetry(fn, { timeoutMs: 1000, retries: 2, tag: 'test' });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses default options', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withTimeoutAndRetry(fn);
    expect(result).toBe('ok');
  });
});
