import { NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = process.env.DATABASE_URL || '';

    // Mask password for security
    const masked = raw.replace(/:([^:@]+)@/, '://***:***@');

    // Extract key details
    const hasVar = !!raw;
    const length = raw.length;
    const protocol = raw.split('://')[0];
    const hasSSL = raw.includes('sslmode=require');
    const port = raw.includes(':6543') ? '6543 (transaction pooler)' : raw.includes(':5432') ? '5432 (direct)' : 'unknown';
    const host = raw.includes('db.udpolhavhefflrawpokb.supabase.co') ? 'correct' : 'incorrect';

    return NextResponse.json({
      hasVar,
      length,
      protocol,
      port,
      host,
      hasSSL,
      maskedUrl: masked,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check environment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
