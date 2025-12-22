import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    ably: ComponentHealth;
  };
  responseTimeMs: number;
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  error?: string;
}

/**
 * Health check endpoint for monitoring and alerting
 *
 * Returns:
 * - 200: All systems healthy
 * - 503: One or more critical systems down
 *
 * Usage:
 * - Uptime monitoring: GET /api/health
 * - Load balancer health checks
 * - Kubernetes liveness/readiness probes
 */
export async function GET() {
  const startTime = Date.now();

  const checks: HealthCheck['checks'] = {
    database: { status: 'down' },
    redis: { status: 'down' },
    ably: { status: 'down' },
  };

  // Check Database (PostgreSQL via Drizzle)
  const dbStart = Date.now();
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1 as health_check`);
    checks.database = {
      status: 'up',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'down',
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // Check Redis (Upstash)
  const redisStart = Date.now();
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    if (!redisUrl) {
      checks.redis = {
        status: 'down',
        error: 'Redis not configured',
      };
    } else {
      // Simple ping test
      await redis.ping();
      checks.redis = {
        status: 'up',
        latencyMs: Date.now() - redisStart,
      };
    }
  } catch (error) {
    checks.redis = {
      status: 'down',
      latencyMs: Date.now() - redisStart,
      error: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }

  // Check Ably
  const ablyStart = Date.now();
  try {
    const ablyKey = process.env.ABLY_API_KEY;
    if (!ablyKey) {
      checks.ably = {
        status: 'down',
        error: 'Ably not configured',
      };
    } else {
      // Extract key ID from API key (format: keyId.keySecret)
      const keyId = ablyKey.split('.')[0];

      // Quick REST API check - get app stats (lightweight)
      const response = await fetch(`https://rest.ably.io/time`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(ablyKey).toString('base64')}`,
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (response.ok) {
        checks.ably = {
          status: 'up',
          latencyMs: Date.now() - ablyStart,
        };
      } else {
        checks.ably = {
          status: 'degraded',
          latencyMs: Date.now() - ablyStart,
          error: `Ably returned ${response.status}`,
        };
      }
    }
  } catch (error) {
    checks.ably = {
      status: 'down',
      latencyMs: Date.now() - ablyStart,
      error: error instanceof Error ? error.message : 'Ably connection failed',
    };
  }

  // Determine overall status
  const allUp = Object.values(checks).every(c => c.status === 'up');
  const anyDown = Object.values(checks).some(c => c.status === 'down');

  // Database is critical - if it's down, the whole system is unhealthy
  const databaseCritical = checks.database.status === 'down';

  let overallStatus: HealthCheck['status'];
  if (databaseCritical || anyDown) {
    overallStatus = 'unhealthy';
  } else if (!allUp) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const healthResponse: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
    responseTimeMs: Date.now() - startTime,
  };

  // Return 503 if critical services are down
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(healthResponse, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-Status': overallStatus,
    },
  });
}
