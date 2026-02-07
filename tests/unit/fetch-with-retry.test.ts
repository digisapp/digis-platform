/**
 * fetchWithRetry Tests
 *
 * Tests the retry-on-network-failure fetch wrapper.
 * Uses real timers with small backoff to avoid fake timer issues.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry, isOnline, getNetworkErrorMessage } from '@/lib/utils/fetchWithRetry';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  // Ensure navigator.onLine is true so network error detection works correctly
  vi.stubGlobal('navigator', { onLine: true });
});

describe('fetchWithRetry', () => {
  it('returns response on success', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('/api/test');
    expect(result).toBe(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns HTTP error responses without retrying', async () => {
    const mockResponse = new Response('Not Found', { status: 404 });
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('/api/test');
    expect(result.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network error (Failed to fetch)', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('/api/test', { retries: 2, backoffMs: 1 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on NetworkError', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('NetworkError when attempting to fetch'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('/api/test', { retries: 2, backoffMs: 1 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all retries', async () => {
    mockFetch.mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      fetchWithRetry('/api/test', { retries: 2, backoffMs: 1 })
    ).rejects.toThrow('Failed to fetch');
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('does not retry non-network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Unexpected token'));

    await expect(
      fetchWithRetry('/api/test', { retries: 3, backoffMs: 1 })
    ).rejects.toThrow('Unexpected token');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback', async () => {
    const onRetry = vi.fn();
    mockFetch
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await fetchWithRetry('/api/test', { retries: 2, backoffMs: 1, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('uses default retries of 3', async () => {
    mockFetch.mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      fetchWithRetry('/api/test', { backoffMs: 1 })
    ).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('passes fetch options through', async () => {
    mockFetch.mockResolvedValueOnce(new Response('ok'));

    await fetchWithRetry('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('succeeds on last retry attempt', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('/api/test', { retries: 2, backoffMs: 1 });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('isOnline', () => {
  it('returns true when navigator.onLine is true', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isOnline()).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isOnline()).toBe(false);
  });
});

describe('getNetworkErrorMessage', () => {
  it('returns offline message when offline', () => {
    expect(getNetworkErrorMessage(true)).toBe('Connection lost. Reconnecting...');
  });

  it('returns network error message when online', () => {
    expect(getNetworkErrorMessage(false)).toBe('Network error. Retrying...');
  });
});
