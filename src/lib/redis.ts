import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client for serverless-compatible Redis operations
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL: Redis REST URL (without quotes or newlines)
 * - UPSTASH_REDIS_REST_TOKEN: Redis REST token (without quotes or newlines)
 *
 * Note: Ensure environment variables do not contain quotes or newlines
 */

// Clean environment variables by trimming whitespace and newlines
const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() || '';
const cleanToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || '';

// Validate environment variables
if (!cleanUrl || !cleanToken) {
  console.warn('[Redis] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
}

if (cleanUrl && (cleanUrl.includes('\n') || cleanUrl.includes('\r'))) {
  console.error('[Upstash Redis] The redis url contains whitespace or newline, which can cause errors!');
}

if (cleanToken && (cleanToken.includes('\n') || cleanToken.includes('\r'))) {
  console.error('[Upstash Redis] The redis token contains whitespace or newline, which can cause errors!');
}

export const redis = new Redis({
  url: cleanUrl,
  token: cleanToken,
});
