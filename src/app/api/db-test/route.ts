import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { sql } from 'drizzle-orm';

// Force Node.js runtime for database access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Database connectivity test endpoint
 * Hit https://www.digis.cc/api/db-test to check if DB is working
 */
export async function GET() {
  try {
    const start = Date.now();

    console.log('[DB-TEST] Testing database connection...');

    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as ok, current_database() as db_name, version() as pg_version`);

    const tookMs = Date.now() - start;

    console.log('[DB-TEST] Database connection successful!', { tookMs });

    return NextResponse.json({
      ok: true,
      tookMs,
      timestamp: new Date().toISOString(),
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'not set',
        nodeEnv: process.env.NODE_ENV,
        runtime: 'nodejs',
      },
      result,
    });
  } catch (err: any) {
    console.error('[DB-TEST ERROR]', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
        code: err?.code,
        timestamp: new Date().toISOString(),
        env: {
          hasDbUrl: !!process.env.DATABASE_URL,
          dbUrlHost: process.env.DATABASE_URL ? 'set' : 'not set',
          nodeEnv: process.env.NODE_ENV,
          runtime: 'nodejs',
        },
      },
      { status: 500 }
    );
  }
}
