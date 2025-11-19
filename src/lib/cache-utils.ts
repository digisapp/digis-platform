/**
 * Cache management utilities
 *
 * Handles user-scoped caching to prevent cross-user data leaks
 * when database is in degraded mode or during role transitions.
 */

/**
 * Clear all app caches for the current or all users
 */
export function clearAppCaches(options: { userId?: string } = {}) {
  if (typeof window === 'undefined') return;

  const { userId } = options;
  const cacheKeyPrefixes = [
    'creators-cache',
    'conversations-cache',
    'explore-cache',
    'messages-cache',
    'profile-cache',
    'wallet-cache',
    'digis_user_role', // Role cache
  ];

  // If userId is specified, only clear caches for that user
  // Otherwise, clear all app-related caches
  Object.keys(localStorage).forEach((key) => {
    const shouldClear = cacheKeyPrefixes.some(prefix => {
      if (userId) {
        // Clear only caches for specific user
        return key.startsWith(`${prefix}:${userId}`);
      } else {
        // Clear all caches with these prefixes
        return key.startsWith(prefix) || key === prefix;
      }
    });

    if (shouldClear) {
      console.log('[CacheUtils] Clearing cache key:', key);
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clear caches for users other than the current user
 * Useful when logging in as a different user
 */
export function clearCachesForOtherUsers(currentUserId: string) {
  if (typeof window === 'undefined') return;

  const cacheKeyPrefixes = [
    'creators-cache',
    'conversations-cache',
    'explore-cache',
    'messages-cache',
    'profile-cache',
    'wallet-cache',
  ];

  Object.keys(localStorage).forEach((key) => {
    cacheKeyPrefixes.forEach(prefix => {
      if (key.startsWith(`${prefix}:`)) {
        // Extract userId from key (format: "prefix:userId:role")
        const parts = key.split(':');
        const userIdFromKey = parts[1];

        if (userIdFromKey && userIdFromKey !== currentUserId) {
          console.log('[CacheUtils] Clearing cache for other user:', key);
          localStorage.removeItem(key);
        }
      }
    });
  });
}

/**
 * Save data to user-scoped cache
 */
export function saveCacheForUser<T>(
  cacheType: string,
  userId: string,
  role: string,
  data: T
): void {
  if (typeof window === 'undefined') return;

  const cacheKey = `${cacheType}-cache:${userId}:${role}`;
  const cacheData = {
    userId,
    role,
    data,
    cachedAt: Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('[CacheUtils] Error saving cache:', error);
  }
}

/**
 * Load data from user-scoped cache
 * Returns null if cache doesn't exist or doesn't match current user/role
 */
export function loadCacheForUser<T>(
  cacheType: string,
  userId: string,
  role: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): T | null {
  if (typeof window === 'undefined') return null;

  const cacheKey = `${cacheType}-cache:${userId}:${role}`;
  const raw = localStorage.getItem(cacheKey);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // Safety check: ensure cache matches current user and role
    if (parsed.userId !== userId || parsed.role !== role) {
      console.warn('[CacheUtils] Cache mismatch - not showing stale data for different user/role');
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Check if cache is too old
    if (Date.now() - parsed.cachedAt > maxAgeMs) {
      console.log('[CacheUtils] Cache expired:', cacheKey);
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data as T;
  } catch (error) {
    console.error('[CacheUtils] Error loading cache:', error);
    return null;
  }
}

/**
 * Get the last authenticated user ID from localStorage
 * Used to detect user changes
 */
export function getLastAuthUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('digis_last_auth_user_id');
}

/**
 * Set the last authenticated user ID
 */
export function setLastAuthUserId(userId: string | null): void {
  if (typeof window === 'undefined') return;

  if (userId) {
    localStorage.setItem('digis_last_auth_user_id', userId);
  } else {
    localStorage.removeItem('digis_last_auth_user_id');
  }
}

/**
 * Check if user has changed and clear caches if needed
 * Returns true if user changed
 */
export function detectAndHandleUserChange(
  currentUserId: string | null,
  options: { forceReload?: boolean } = {}
): boolean {
  const lastUserId = getLastAuthUserId();

  if (currentUserId && lastUserId && currentUserId !== lastUserId) {
    console.log('[CacheUtils] User changed from', lastUserId, 'to', currentUserId);
    console.log('[CacheUtils] Clearing all app caches...');
    clearAppCaches();
    setLastAuthUserId(currentUserId);

    // Force reload to clear all React state and ensure fresh data
    if (options.forceReload && typeof window !== 'undefined') {
      console.log('[CacheUtils] Force reloading page to clear stale state...');
      window.location.reload();
    }

    return true;
  }

  if (currentUserId) {
    setLastAuthUserId(currentUserId);
  }

  return false;
}
