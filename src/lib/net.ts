/**
 * Network utilities for performant API calls
 */

type CachePolicy = 'no-store' | 'no-cache' | 'force-cache' | 'default';

interface FetchJSONOptions extends Omit<RequestInit, 'signal'> {
  /**
   * Cache policy for the request
   * - 'no-store': Never cache (default for mutations)
   * - 'no-cache': Validate with server before using cache
   * - 'force-cache': Always use cache if available
   * - 'default': Browser default behavior
   *
   * @default 'no-store'
   */
  cachePolicy?: CachePolicy;
}

/**
 * Fetch JSON with timeout, abort control, and configurable caching
 *
 * @param url - The URL to fetch
 * @param opts - Fetch options including cache policy
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Parsed JSON response
 *
 * @example
 * ```ts
 * // Default: no caching (good for mutations/real-time data)
 * const data = await fetchJSON('/api/user');
 *
 * // Allow browser caching (good for static data)
 * const creators = await fetchJSON('/api/creators', { cachePolicy: 'default' });
 *
 * // Force cache (good for rarely changing data)
 * const gifts = await fetchJSON('/api/gifts', { cachePolicy: 'force-cache' });
 * ```
 */
export async function fetchJSON<T = unknown>(
  url: string,
  opts: FetchJSONOptions = {},
  timeoutMs = 5000
): Promise<T> {
  const { cachePolicy = 'no-store', ...fetchOpts } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOpts,
      signal: ctrl.signal,
      cache: cachePolicy,
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute multiple promises in parallel and handle failures gracefully
 * Returns null for failed promises instead of throwing
 * @param promises - Array of promises to execute
 * @returns Array of results (null for failures)
 */
export async function allSettled<T>(promises: Promise<T>[]): Promise<(T | null)[]> {
  const results = await Promise.allSettled(promises);
  return results.map((result) =>
    result.status === 'fulfilled' ? result.value : null
  );
}
