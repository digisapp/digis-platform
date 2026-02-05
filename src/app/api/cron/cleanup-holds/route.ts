import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { spendHolds, wallets } from '@/db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { CallService } from '@/lib/services/call-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/cleanup-holds
 * Clean up stale holds that have been active for more than 24 hours.
 * Also cleans up stale calls (pending, accepted, active).
 * This prevents coins from being permanently locked if a call/stream
 * doesn't properly release its hold.
 *
 * Should be called via Vercel Cron or similar scheduler.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (fail-closed: reject if secret not configured)
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
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

    // Batch release all stale holds in a single transaction
    const holdIds = staleHolds.map(h => h.id);

    // Group amounts by userId for wallet updates
    const amountsByUser = new Map<string, number>();
    for (const hold of staleHolds) {
      const current = amountsByUser.get(hold.userId) || 0;
      amountsByUser.set(hold.userId, current + hold.amount);
    }

    let cleaned = 0;
    const errors: string[] = [];

    try {
      await db.transaction(async (tx) => {
        // Batch update all hold statuses in a single query
        await tx
          .update(spendHolds)
          .set({
            status: 'released',
            releasedAt: new Date(),
          })
          .where(sql`${spendHolds.id} = ANY(${holdIds})`);

        // Update each user's wallet (grouped by userId)
        for (const [userId, totalAmount] of amountsByUser) {
          await tx
            .update(wallets)
            .set({
              heldBalance: sql`GREATEST(0, ${wallets.heldBalance} - ${totalAmount})`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, userId));
        }
      });

      cleaned = staleHolds.length;
      console.log(`[Cleanup Holds] Successfully released ${cleaned} stale holds for ${amountsByUser.size} users`);
    } catch (err) {
      const errorMsg = `Failed to release holds: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error(`[Cleanup Holds] ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Also cleanup stale calls (pending, accepted, active)
    let callCleanup = { pending: 0, accepted: 0, active: 0 };
    try {
      callCleanup = await CallService.runAllCleanup();
    } catch (callErr) {
      console.error('[Cleanup Holds] Call cleanup error:', callErr);
      errors.push(`Call cleanup failed: ${callErr instanceof Error ? callErr.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      message: `Released ${cleaned} stale holds, cleaned ${callCleanup.pending + callCleanup.accepted + callCleanup.active} stale calls`,
      cleaned,
      total: staleHolds.length,
      callCleanup,
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
