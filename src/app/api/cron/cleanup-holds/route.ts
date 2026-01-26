import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { spendHolds, wallets } from '@/db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/cleanup-holds
 * Clean up stale holds that have been active for more than 24 hours.
 * This prevents coins from being permanently locked if a call/stream
 * doesn't properly release its hold.
 *
 * Should be called via Vercel Cron or similar scheduler.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find holds older than 24 hours that are still active
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const staleHolds = await db.query.spendHolds.findMany({
      where: and(
        eq(spendHolds.status, 'active'),
        lt(spendHolds.createdAt, twentyFourHoursAgo)
      ),
    });

    if (staleHolds.length === 0) {
      console.log('[Cleanup Holds] No stale holds found');
      return NextResponse.json({
        success: true,
        message: 'No stale holds to clean up',
        cleaned: 0,
      });
    }

    console.log(`[Cleanup Holds] Found ${staleHolds.length} stale holds to release`);

    // Release each stale hold
    let cleaned = 0;
    const errors: string[] = [];

    for (const hold of staleHolds) {
      try {
        await db.transaction(async (tx) => {
          // Update hold status to released
          await tx
            .update(spendHolds)
            .set({
              status: 'released',
              releasedAt: new Date(),
            })
            .where(eq(spendHolds.id, hold.id));

          // Release the held balance
          await tx
            .update(wallets)
            .set({
              heldBalance: sql`GREATEST(0, ${wallets.heldBalance} - ${hold.amount})`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, hold.userId));
        });

        console.log(`[Cleanup Holds] Released stale hold ${hold.id} for user ${hold.userId} (${hold.amount} coins)`);
        cleaned++;
      } catch (err) {
        const errorMsg = `Failed to release hold ${hold.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(`[Cleanup Holds] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Released ${cleaned} stale holds`,
      cleaned,
      total: staleHolds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Cleanup Holds] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup holds' },
      { status: 500 }
    );
  }
}

// Also allow GET for easy manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
