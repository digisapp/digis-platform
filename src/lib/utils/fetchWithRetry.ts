// Utility for retrying fetch requests on network failures
// Handles ERR_NETWORK_CHANGED and other transient network issues

export interface FetchWithRetryOptions extends RequestInit {
  retries?: number;
  backoffMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retries = 3, backoffMs = 1000, onRetry, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      return response;
    } catch (err) {
      const error = err as Error;
      const isLastAttempt = attempt === retries;

      // Check if this is a network-related error worth retrying
      const isNetworkError =
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('network') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      // Notify about retry attempt
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait with exponential backoff before retrying
      await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error('fetchWithRetry unexpected fallthrough');
}

// Helper to check if user is online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Helper to get a user-friendly network error message
export function getNetworkErrorMessage(isOffline: boolean): string {
  return isOffline
    ? 'Connection lost. Reconnecting...'
    : 'Network error. Retrying...';
}
