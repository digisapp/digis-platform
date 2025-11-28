import { redis } from './redis';

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get<string>(key);
    return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as T : null;
  } catch (error) {
    console.error('[Cache] Error getting cached value:', error);
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlSeconds: number) {
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (error) {
    console.error('[Cache] Error setting cached value:', error);
  }
}

export async function invalidateCache(key: string) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('[Cache] Error invalidating cache:', error);
  }
}

export async function invalidateCachePattern(pattern: string) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)));
    }
  } catch (error) {
    console.error('[Cache] Error invalidating cache pattern:', error);
  }
}

/** avoid thundering herd */
export async function withMiniLock<T>(key: string, fn: () => Promise<T>, ttl = 10) {
  const cacheKey = `cache:${key}`;
  const lockKey = `lock:${cacheKey}`;
  const cached = await getCached<T>(cacheKey);
  if (cached) return cached;

  const gotLock = await redis.set(lockKey, '1', { nx: true, px: 2000 });
  if (!gotLock) {
    // brief backoff and retry cache once
    await new Promise(r => setTimeout(r, 120));
    const again = await getCached<T>(cacheKey);
    if (again) return again;
  }

  const fresh = await fn();
  await setCached(cacheKey, fresh, ttl);
  await redis.del(lockKey);
  return fresh;
}

// ============================================
// WALLET BALANCE CACHING
// ============================================

const BALANCE_CACHE_TTL = 30; // 30 seconds - balance updates frequently

export async function getCachedBalance(userId: string): Promise<number | null> {
  return getCached<number>(`balance:${userId}`);
}

export async function setCachedBalance(userId: string, balance: number) {
  await setCached(`balance:${userId}`, balance, BALANCE_CACHE_TTL);
}

export async function invalidateBalanceCache(userId: string) {
  await invalidateCache(`balance:${userId}`);
}

// ============================================
// STREAM VIEWER COUNT CACHING
// ============================================

const VIEWER_COUNT_CACHE_TTL = 10; // 10 seconds - viewers change rapidly

export async function getCachedViewerCount(streamId: string): Promise<number | null> {
  return getCached<number>(`viewers:${streamId}`);
}

export async function setCachedViewerCount(streamId: string, count: number) {
  await setCached(`viewers:${streamId}`, count, VIEWER_COUNT_CACHE_TTL);
}

export async function invalidateViewerCountCache(streamId: string) {
  await invalidateCache(`viewers:${streamId}`);
}

// Increment viewer count atomically
export async function incrementViewerCount(streamId: string): Promise<number> {
  try {
    const key = `viewers:${streamId}`;
    const newCount = await redis.incr(key);
    await redis.expire(key, VIEWER_COUNT_CACHE_TTL * 6); // Longer TTL for active streams
    return newCount;
  } catch (error) {
    console.error('[Cache] Error incrementing viewer count:', error);
    return 0;
  }
}

export async function decrementViewerCount(streamId: string): Promise<number> {
  try {
    const key = `viewers:${streamId}`;
    const newCount = await redis.decr(key);
    // Don't let it go negative
    if (newCount < 0) {
      await redis.set(key, 0, { ex: VIEWER_COUNT_CACHE_TTL });
      return 0;
    }
    return newCount;
  } catch (error) {
    console.error('[Cache] Error decrementing viewer count:', error);
    return 0;
  }
}

// ============================================
// CONVERSATION LIST CACHING
// ============================================

const CONVERSATION_LIST_CACHE_TTL = 60; // 1 minute

export interface CachedConversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
}

export async function getCachedConversations(userId: string): Promise<CachedConversation[] | null> {
  return getCached<CachedConversation[]>(`conversations:${userId}`);
}

export async function setCachedConversations(userId: string, conversations: CachedConversation[]) {
  await setCached(`conversations:${userId}`, conversations, CONVERSATION_LIST_CACHE_TTL);
}

export async function invalidateConversationsCache(userId: string) {
  await invalidateCache(`conversations:${userId}`);
}

// Invalidate for both users in a conversation
export async function invalidateConversationsCacheForBoth(user1Id: string, user2Id: string) {
  await Promise.all([
    invalidateConversationsCache(user1Id),
    invalidateConversationsCache(user2Id),
  ]);
}
