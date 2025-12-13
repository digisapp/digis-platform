import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streamMessages, streams } from '@/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/streams/[streamId]/tip-menu-stats
 * Get tip menu purchase statistics for a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: { creatorId: true },
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get all tip menu purchases for this stream
    const tipMenuPurchases = await db.query.streamMessages.findMany({
      where: and(
        eq(streamMessages.streamId, streamId),
        isNotNull(streamMessages.tipMenuItemId)
      ),
      columns: {
        tipMenuItemId: true,
        tipMenuItemLabel: true,
        giftAmount: true,
        username: true,
        userId: true,
      },
    });

    // Aggregate stats by menu item
    const itemStats: Record<string, {
      label: string;
      totalCoins: number;
      purchaseCount: number;
      purchasers: Array<{ username: string; amount: number }>;
    }> = {};

    let totalTipMenuCoins = 0;

    for (const purchase of tipMenuPurchases) {
      if (!purchase.tipMenuItemId || !purchase.tipMenuItemLabel) continue;

      const itemId = purchase.tipMenuItemId;
      const amount = purchase.giftAmount || 0;
      totalTipMenuCoins += amount;

      if (!itemStats[itemId]) {
        itemStats[itemId] = {
          label: purchase.tipMenuItemLabel,
          totalCoins: 0,
          purchaseCount: 0,
          purchasers: [],
        };
      }

      itemStats[itemId].totalCoins += amount;
      itemStats[itemId].purchaseCount += 1;
      itemStats[itemId].purchasers.push({
        username: purchase.username,
        amount,
      });
    }

    // Convert to array and sort by total coins
    const items = Object.entries(itemStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.totalCoins - a.totalCoins);

    return NextResponse.json({
      totalTipMenuCoins,
      totalPurchases: tipMenuPurchases.length,
      items,
    });
  } catch (error: any) {
    console.error('Error fetching tip menu stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tip menu stats' },
      { status: 500 }
    );
  }
}
