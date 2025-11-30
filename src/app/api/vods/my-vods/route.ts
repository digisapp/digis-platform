import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods, vodPurchases, subscriptions } from '@/lib/data/system';
import { eq, desc, and, or, gt, sql, count } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get VODs for a creator with pagination
 * If userId is provided, fetches public VODs for that creator (for profile page)
 * Otherwise, fetches all VODs for the authenticated creator
 */
export async function GET(req: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    let creatorId: string;
    let isPublicView = false;
    let viewerId: string | null = null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (userId) {
      // Public view - fetch VODs for specified user
      creatorId = userId;
      isPublicView = true;
      viewerId = user?.id || null;
    } else {
      // Private view - fetch all VODs for authenticated user
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      creatorId = user.id;
    }

    // Get VODs with pagination and timeout protection
    const creatorVODs = await withTimeoutAndRetry(
      () => db.query.vods.findMany({
        where: eq(vods.creatorId, creatorId),
        orderBy: [desc(vods.createdAt)],
        limit,
        offset,
      }),
      { timeoutMs: 8000, retries: 1, tag: 'myVods' }
    );

    // For public view, filter to accessible VODs only
    let accessibleVODs = creatorVODs;
    let purchasedVodIds: Set<string> = new Set();
    let isSubscribed = false;

    if (isPublicView) {
      // Check if viewer has active subscription to creator
      if (viewerId) {
        const subscription = await db.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, viewerId),
            eq(subscriptions.creatorId, creatorId),
            eq(subscriptions.status, 'active')
          ),
        });
        isSubscribed = !!subscription;

        // Get viewer's purchased VODs
        const purchases = await db.query.vodPurchases.findMany({
          where: eq(vodPurchases.userId, viewerId),
        });
        purchasedVodIds = new Set(purchases.map(p => p.vodId));
      }

      // Filter VODs based on access
      accessibleVODs = creatorVODs.filter(vod => {
        // Public VODs are always visible
        if (vod.isPublic) return true;

        // User has purchased this VOD
        if (purchasedVodIds.has(vod.id)) return true;

        // Free for subscribers and user is subscribed
        if (vod.priceCoins === 0 && vod.subscribersOnly && isSubscribed) return true;

        // PPV VODs (priceCoins > 0) - only show if purchased
        // Non-public, non-purchased VODs are hidden from public view
        return false;
      });
    }

    // Calculate totals (only for creator's own view, not public)
    const vodsForTotals = isPublicView ? accessibleVODs : creatorVODs;
    const totals = vodsForTotals.reduce(
      (acc, vod) => ({
        totalViews: acc.totalViews + vod.viewCount,
        totalPurchases: acc.totalPurchases + vod.purchaseCount,
        totalEarnings: acc.totalEarnings + vod.totalEarnings,
      }),
      { totalViews: 0, totalPurchases: 0, totalEarnings: 0 }
    );

    return NextResponse.json({
      vods: accessibleVODs,
      totals: isPublicView ? undefined : totals, // Don't expose earnings to public
      count: accessibleVODs.length,
    });
  } catch (error: any) {
    console.error('[My VODs]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Service temporarily unavailable' : 'Failed to fetch VODs', vods: [] },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}
