import { redis } from '@/lib/redis';

/**
 * Redis Cache for Hot Data
 *
 * Caches frequently accessed, rarely changing data:
 * - Virtual gifts catalog (changes very rarely)
 * - Creator public profiles/stats (changes infrequently)
 * - Subscription tiers (changes when creator updates pricing)
 *
 * TTL Strategy:
 * - Gifts: 1 hour (rarely changes, can be manually invalidated)
 * - Creator profiles: 5 minutes (balances freshness vs performance)
 * - Subscription tiers: 10 minutes (creators don't change pricing often)
 */

// Cache TTLs in seconds
const TTL = {
  GIFTS: 60 * 60,           // 1 hour
  CREATOR_PROFILE: 60 * 5,  // 5 minutes
  SUBSCRIPTION_TIERS: 60 * 10, // 10 minutes
  VIEWER_COUNT: 30,         // 30 seconds (frequently updated)
  API_RESPONSE: 15,         // 15 seconds (hot API endpoints)
} as const;

// Cache key prefixes
const KEYS = {
  GIFTS: 'cache:gifts:all',
  CREATOR_PROFILE: 'cache:creator:profile:',
  SUBSCRIPTION_TIERS: 'cache:creator:tiers:',
  STREAM_VIEWERS: 'cache:stream:viewers:',
  STREAM_VIEWER_SET: 'cache:stream:viewer_set:',
  API_RESPONSE: 'cache:api:',
} as const;

/**
 * Cache virtual gifts catalog
 * Returns cached data if available, otherwise calls fetcher
 */
export async function getCachedGifts<T>(fetcher: () => Promise<T>): Promise<T> {
  try {
    // Try to get from cache
    const cached = await redis.get(KEYS.GIFTS);
    if (cached) {
      return cached as T;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache for 1 hour
    await redis.set(KEYS.GIFTS, data, { ex: TTL.GIFTS });

    return data;
  } catch (error) {
    console.error('[Cache] Error in getCachedGifts:', error);
    // Fallback to fetcher on cache error
    return fetcher();
  }
}

/**
 * Invalidate gifts cache (call when gifts are added/updated)
 */
export async function invalidateGiftsCache(): Promise<void> {
  try {
    await redis.del(KEYS.GIFTS);
  } catch (error) {
    console.error('[Cache] Error invalidating gifts cache:', error);
  }
}

/**
 * Cache creator public profile (non-personalized data)
 */
export async function getCachedCreatorProfile<T>(
  creatorId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const key = `${KEYS.CREATOR_PROFILE}${creatorId}`;
    const cached = await redis.get(key);
    if (cached) {
      return cached as T;
    }

    const data = await fetcher();
    await redis.set(key, data, { ex: TTL.CREATOR_PROFILE });

    return data;
  } catch (error) {
    console.error('[Cache] Error in getCachedCreatorProfile:', error);
    return fetcher();
  }
}

/**
 * Invalidate creator profile cache
 */
export async function invalidateCreatorProfile(creatorId: string): Promise<void> {
  try {
    await redis.del(`${KEYS.CREATOR_PROFILE}${creatorId}`);
  } catch (error) {
    console.error('[Cache] Error invalidating creator profile:', error);
  }
}

/**
 * Cache subscription tiers for a creator
 */
export async function getCachedSubscriptionTiers<T>(
  creatorId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const key = `${KEYS.SUBSCRIPTION_TIERS}${creatorId}`;
    const cached = await redis.get(key);
    if (cached) {
      return cached as T;
    }

    const data = await fetcher();
    await redis.set(key, data, { ex: TTL.SUBSCRIPTION_TIERS });

    return data;
  } catch (error) {
    console.error('[Cache] Error in getCachedSubscriptionTiers:', error);
    return fetcher();
  }
}

/**
 * Invalidate subscription tiers cache
 */
export async function invalidateSubscriptionTiers(creatorId: string): Promise<void> {
  try {
    await redis.del(`${KEYS.SUBSCRIPTION_TIERS}${creatorId}`);
  } catch (error) {
    console.error('[Cache] Error invalidating subscription tiers:', error);
  }
}

// ============================================
// Stream Viewer Count (Redis-based)
// ============================================

/**
 * Add a viewer to a stream (uses HyperLogLog for approximate unique count)
 * This prevents DB write storms from viewer heartbeats
 */
export async function addStreamViewer(streamId: string, visitorId: string): Promise<number> {
  try {
    const setKey = `${KEYS.STREAM_VIEWER_SET}${streamId}`;

    // Add to HyperLogLog for unique count
    await redis.pfadd(setKey, visitorId);

    // Set expiry on the key (auto-cleanup when stream ends)
    await redis.expire(setKey, 60 * 60 * 4); // 4 hours max

    // Get approximate unique count
    const count = await redis.pfcount(setKey);

    // Also cache the count for fast reads
    await redis.set(`${KEYS.STREAM_VIEWERS}${streamId}`, count, { ex: TTL.VIEWER_COUNT });

    return count;
  } catch (error) {
    console.error('[Cache] Error adding stream viewer:', error);
    return 0;
  }
}

/**
 * Get stream viewer count (cached)
 * Falls back to HyperLogLog count if cache miss
 */
export async function getStreamViewerCount(streamId: string): Promise<number> {
  try {
    // Try cached count first
    const cached = await redis.get(`${KEYS.STREAM_VIEWERS}${streamId}`);
    if (cached !== null) {
      return Number(cached);
    }

    // Fall back to HyperLogLog count
    const count = await redis.pfcount(`${KEYS.STREAM_VIEWER_SET}${streamId}`);
    return count;
  } catch (error) {
    console.error('[Cache] Error getting stream viewer count:', error);
    return 0;
  }
}

/**
 * Remove viewer tracking when stream ends
 */
export async function clearStreamViewers(streamId: string): Promise<void> {
  try {
    await redis.del(`${KEYS.STREAM_VIEWER_SET}${streamId}`);
    await redis.del(`${KEYS.STREAM_VIEWERS}${streamId}`);
  } catch (error) {
    console.error('[Cache] Error clearing stream viewers:', error);
  }
}

/**
 * Batch get viewer counts for multiple streams (for live streams list)
 */
export async function getMultipleStreamViewerCounts(streamIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (streamIds.length === 0) return counts;

  try {
    // Use pipeline for efficiency
    const pipeline = redis.pipeline();
    streamIds.forEach(id => {
      pipeline.pfcount(`${KEYS.STREAM_VIEWER_SET}${id}`);
    });

    const results = await pipeline.exec();
    streamIds.forEach((id, index) => {
      counts.set(id, Number(results?.[index] ?? 0));
    });
  } catch (error) {
    console.error('[Cache] Error getting multiple stream viewer counts:', error);
  }

  return counts;
}

// ============================================
// API Response Cache (for hot endpoints)
// ============================================

/**
 * Cache an API response in Redis with short TTL
 * Used for high-traffic public endpoints like /api/watch, /api/explore
 */
export async function getCachedApiResponse<T>(
  endpoint: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = TTL.API_RESPONSE
): Promise<T> {
  try {
    const key = `${KEYS.API_RESPONSE}${endpoint}`;
    const cached = await redis.get(key);
    if (cached) {
      return cached as T;
    }

    const data = await fetcher();
    await redis.set(key, data, { ex: ttlSeconds });

    return data;
  } catch (error) {
    console.error(`[Cache] Error in getCachedApiResponse(${endpoint}):`, error);
    return fetcher();
  }
}
