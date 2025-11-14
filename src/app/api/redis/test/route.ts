import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Test Redis connection
 * GET /api/redis/test
 */
export async function GET() {
  try {
    // Test basic SET/GET
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hello from Upstash!', timestamp: new Date().toISOString() };

    await redis.set(testKey, JSON.stringify(testValue), { ex: 10 });
    const retrieved = await redis.get(testKey);

    // Test key deletion
    await redis.del(testKey);

    // Get some stats
    const dbSize = await redis.dbsize();

    return NextResponse.json({
      status: 'success',
      message: 'Upstash Redis is connected and working!',
      test: {
        key: testKey,
        written: testValue,
        retrieved: retrieved ? JSON.parse(retrieved as string) : null,
        match: JSON.stringify(testValue) === retrieved,
      },
      stats: {
        dbSize,
      },
    });
  } catch (error: any) {
    console.error('[Redis Test] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Redis connection failed',
        error: error.message,
        hint: 'Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables',
      },
      { status: 500 }
    );
  }
}
