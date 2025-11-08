import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { sql } from 'drizzle-orm';

// Force Node.js runtime for database access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to validate database connectivity
 * Hit https://www.digis.cc/api/_diag to check if DB is working
 */
export async function GET() {
  try {
    const start = Date.now();

    console.log('[DIAG] Testing database connection...');

    // Simple query to test connection
    const result = await db.execute(sql`SELECT 1 as ok, current_database() as db_name, version() as pg_version`);

    const tookMs = Date.now() - start;

    console.log('[DIAG] Database connection successful!', { tookMs });

    return NextResponse.json({
      ok: true,
      tookMs,
      timestamp: new Date().toISOString(),
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        runtime: 'nodejs',
      },
      result: result.rows,
    });
  } catch (err: any) {
    console.error('[DIAG ERROR]', {
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
          nodeEnv: process.env.NODE_ENV,
          runtime: 'nodejs',
        },
      },
      { status: 500 }
    );
  }
}
