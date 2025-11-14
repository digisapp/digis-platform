import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client for serverless-compatible Redis operations
 *
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL: Redis REST URL (without quotes)
 * - UPSTASH_REDIS_REST_TOKEN: Redis REST token (without quotes)
 *
 * Note: Ensure environment variables do not contain quotes or newlines
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
