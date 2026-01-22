import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { redis } from '@/lib/redis';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthCheckResult {
  status: ServiceStatus;
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: { status: ServiceStatus; latencyMs?: number; error?: string };
    redis: { status: ServiceStatus; latencyMs?: number; error?: string };
  };
}

/**
 * Health check endpoint for monitoring
 * GET /api/health - Returns overall system health status
 */
export async function GET() {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: { status: 'healthy' },
      redis: { status: 'healthy' },
    },
  };

  // Check database health
  try {
    const dbStart = Date.now();
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      ),
    ]);
    result.services.database.latencyMs = Date.now() - dbStart;
  } catch (error) {
    result.services.database.status = 'unhealthy';
    result.services.database.error = error instanceof Error ? error.message : 'Unknown error';
    result.status = 'degraded';
  }

  // Check Redis health
  try {
    const redisStart = Date.now();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis timeout')), 3000)
      ),
    ]);
    result.services.redis.latencyMs = Date.now() - redisStart;
  } catch (error) {
    result.services.redis.status = 'unhealthy';
    result.services.redis.error = error instanceof Error ? error.message : 'Unknown error';
    result.status = 'degraded';
  }

  // If all services are unhealthy, mark overall as unhealthy
  const allUnhealthy = Object.values(result.services).every(s => s.status === 'unhealthy');
  if (allUnhealthy) {
    result.status = 'unhealthy';
  }

  // Return appropriate status code
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, { status: statusCode });
}
