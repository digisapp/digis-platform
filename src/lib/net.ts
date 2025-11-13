/**
 * Network utilities for performant API calls
 */

/**
 * Fetch JSON with timeout and abort control
 * @param url - The URL to fetch
 * @param opts - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Parsed JSON response
 */
export async function fetchJSON<T = any>(
  url: string,
  opts: RequestInit = {},
  timeoutMs = 5000
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      cache: 'no-store',
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
