/**
 * API response envelope for structured error handling
 */

export type ApiErrorSource = 'timeout' | 'db' | 'auth' | 'validation' | 'unknown';

export type ApiEnvelope<T> = {
  /** The actual data (null if error or degraded) */
  data: T | null;

  /** Error message if something went wrong */
  error?: string;

  /** True when we fell back due to timeout/DB issues but app is still functional */
  degraded?: boolean;

  /** Source of the error/degradation */
  source?: ApiErrorSource;

  /** Optional request ID for tracking */
  requestId?: string;
};

/**
 * Helper to create a success response
 */
export function success<T>(data: T, requestId?: string): ApiEnvelope<T> {
  return {
    data,
    ...(requestId && { requestId }),
  };
}

/**
 * Helper to create a degraded response (partial failure)
 */
export function degraded<T>(
  fallbackData: T,
  error: string,
  source: ApiErrorSource = 'unknown',
  requestId?: string
): ApiEnvelope<T> {
  return {
    data: fallbackData,
    error,
    degraded: true,
    source,
    ...(requestId && { requestId }),
  };
}

/**
 * Helper to create an error response
 */
export function failure<T = null>(
  error: string,
  source: ApiErrorSource = 'unknown',
  requestId?: string
): ApiEnvelope<T> {
  return {
    data: null,
    error,
    source,
    ...(requestId && { requestId }),
  };
}
