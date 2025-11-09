/**
 * Async utilities for timeout and retry handling
 */

/**
 * Run a promise with a timeout
 * @param p Promise to run
 * @param ms Timeout in milliseconds
 * @param tag Operation tag for error messages
 */
export async function withTimeout<T>(
  p: Promise<T>,
  ms: number = 5000,
  tag: string = 'operation'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${tag} timeout after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([p, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

/**
 * Retry a function with exponential backoff and jitter
 * @param fn Function to retry
 * @param times Number of retry attempts (default 2)
 * @param baseDelayMs Base delay in ms (default 250)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  times: number = 2,
  baseDelayMs: number = 250
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't delay after the last attempt
      if (attempt === times) {
        break;
      }

      // Exponential backoff with jitter: base * 2^attempt + random(0-100ms)
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Combine timeout and retry for database operations
 * @param fn Function to execute
 * @param options Configuration options
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    retries?: number;
    tag?: string;
  } = {}
): Promise<T> {
  const { timeoutMs = 5000, retries = 2, tag = 'operation' } = options;

  return withRetry(
    () => withTimeout(fn(), timeoutMs, tag),
    retries
  );
}
