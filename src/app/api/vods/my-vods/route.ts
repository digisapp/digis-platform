import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods } from '@/lib/data/system';
import { eq, desc } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get all VODs for a creator
 * If userId is provided, fetches public VODs for that creator (for profile page)
 * Otherwise, fetches all VODs for the authenticated creator
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let creatorId: string;

    if (userId) {
      // Public view - fetch VODs for specified user (only public ones)
      creatorId = userId;
    } else {
      // Private view - fetch all VODs for authenticated user
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      creatorId = user.id;
    }

    // Get all VODs for this creator
    const creatorVODs = await db.query.vods.findMany({
      where: eq(vods.creatorId, creatorId),
      orderBy: [desc(vods.createdAt)],
    });

    // Calculate totals
    const totals = creatorVODs.reduce(
      (acc, vod) => ({
        totalViews: acc.totalViews + vod.viewCount,
        totalPurchases: acc.totalPurchases + vod.purchaseCount,
        totalEarnings: acc.totalEarnings + vod.totalEarnings,
      }),
      { totalViews: 0, totalPurchases: 0, totalEarnings: 0 }
    );

    return NextResponse.json({
      vods: creatorVODs,
      totals,
      count: creatorVODs.length,
    });
  } catch (error: any) {
    console.error('[My VODs] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch VODs' },
      { status: 500 }
    );
  }
}
