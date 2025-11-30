import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { calls } from '@/lib/data/system';
import { eq, and, gte, sql, count, sum } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = nanoid(10);

  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run ALL stats queries in parallel using SQL aggregations (not JS filtering)
    const [
      totalCompletedResult,
      todayCompletedResult,
      minutesAndEarningsResult,
      pendingResult,
    ] = await withTimeoutAndRetry(
      () => Promise.all([
        // Count total completed calls
        db.select({ count: count() })
          .from(calls)
          .where(and(
            eq(calls.creatorId, user.id),
            eq(calls.status, 'completed')
          )),

        // Count completed calls today
        db.select({ count: count() })
          .from(calls)
          .where(and(
            eq(calls.creatorId, user.id),
            eq(calls.status, 'completed'),
            gte(calls.createdAt, today)
          )),

        // Sum duration and earnings for completed calls
        db.select({
          totalMinutes: sql<number>`COALESCE(SUM(FLOOR(${calls.durationSeconds} / 60)), 0)`,
          totalEarnings: sql<number>`COALESCE(SUM(${calls.actualCoins}), 0)`,
        })
          .from(calls)
          .where(and(
            eq(calls.creatorId, user.id),
            eq(calls.status, 'completed')
          )),

        // Count pending requests
        db.select({ count: count() })
          .from(calls)
          .where(and(
            eq(calls.creatorId, user.id),
            eq(calls.status, 'pending')
          )),
      ]),
      { timeoutMs: 8000, retries: 1, tag: 'callStats' }
    );

    const totalCalls = totalCompletedResult[0]?.count || 0;
    const callsToday = todayCompletedResult[0]?.count || 0;
    const totalMinutes = Number(minutesAndEarningsResult[0]?.totalMinutes) || 0;
    const totalEarnings = Number(minutesAndEarningsResult[0]?.totalEarnings) || 0;
    const pendingRequests = pendingResult[0]?.count || 0;

    // Calculate average rating (simplified - would need ratings table)
    const averageRating = 4.8; // Placeholder

    return NextResponse.json({
      totalCalls,
      totalMinutes,
      totalEarnings,
      averageRating,
      callsToday,
      pendingRequests,
    });
  } catch (error: any) {
    console.error('[calls/stats]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Service temporarily unavailable' : 'Failed to fetch call stats' },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}
