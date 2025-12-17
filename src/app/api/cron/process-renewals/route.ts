import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Timing-safe string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// GET - Process subscription renewals (called by Vercel Cron)
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Verify cron secret - no fallback allowed
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    const expectedHeader = `Bearer ${cronSecret}`;

    if (!authHeader || !secureCompare(authHeader, expectedHeader)) {
      console.error('[Cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting subscription renewal processing...');
    const startTime = Date.now();

    const results = await SubscriptionService.processRenewals();

    const duration = Date.now() - startTime;

    console.log(`[Cron] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log full error server-side, return generic message
    console.error('[Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
