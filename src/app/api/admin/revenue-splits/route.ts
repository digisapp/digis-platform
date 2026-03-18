import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorRevenueSplits, revenueSplitLedger } from '@/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { RevenueSplitService } from '@/lib/services/revenue-split-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/revenue-splits
 * Returns platform fee configs + all creator overrides + ledger stats
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { isAdmin: true },
    });
    if (!dbUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [platformFees, creatorSplits, ledgerStats] = await Promise.all([
      RevenueSplitService.getPlatformFees(),

      db.select({
        id: creatorRevenueSplits.id,
        creatorId: creatorRevenueSplits.creatorId,
        platformFeePercent: creatorRevenueSplits.platformFeePercent,
        agencyId: creatorRevenueSplits.agencyId,
        agencyFeePercent: creatorRevenueSplits.agencyFeePercent,
        agencyName: creatorRevenueSplits.agencyName,
        effectiveFrom: creatorRevenueSplits.effectiveFrom,
        effectiveUntil: creatorRevenueSplits.effectiveUntil,
        isActive: creatorRevenueSplits.isActive,
        notes: creatorRevenueSplits.notes,
        creatorUsername: users.username,
        creatorDisplayName: users.displayName,
      })
        .from(creatorRevenueSplits)
        .innerJoin(users, eq(creatorRevenueSplits.creatorId, users.id))
        .where(eq(creatorRevenueSplits.isActive, true))
        .orderBy(desc(creatorRevenueSplits.createdAt)),

      db.select({
        totalTransactions: count(),
        totalGross: sql<number>`COALESCE(sum(gross_amount), 0)`,
        totalPlatformFees: sql<number>`COALESCE(sum(platform_fee_amount), 0)`,
        totalAgencyFees: sql<number>`COALESCE(sum(agency_fee_amount), 0)`,
        totalCreatorNet: sql<number>`COALESCE(sum(creator_net_amount), 0)`,
      }).from(revenueSplitLedger),
    ]);

    return NextResponse.json({
      platformFees,
      creatorSplits,
      ledgerStats: ledgerStats[0] ? {
        totalTransactions: Number(ledgerStats[0].totalTransactions),
        totalGross: Number(ledgerStats[0].totalGross),
        totalPlatformFees: Number(ledgerStats[0].totalPlatformFees),
        totalAgencyFees: Number(ledgerStats[0].totalAgencyFees),
        totalCreatorNet: Number(ledgerStats[0].totalCreatorNet),
      } : null,
    });
  } catch (error) {
    console.error('[Admin Revenue Splits]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/**
 * POST /api/admin/revenue-splits
 * Update platform fees or set creator-specific splits
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { isAdmin: true },
    });
    if (!dbUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    if (action === 'update_platform_fee') {
      const { key, feePercent } = body;
      if (!key || feePercent == null || feePercent < 0 || feePercent > 100) {
        return NextResponse.json({ error: 'Invalid fee' }, { status: 400 });
      }
      await RevenueSplitService.updatePlatformFee(key, feePercent, user.id);
      return NextResponse.json({ success: true });
    }

    if (action === 'set_creator_split') {
      const { creatorId, platformFeePercent, agencyId, agencyFeePercent, agencyName, effectiveUntil, notes } = body;
      if (!creatorId) {
        return NextResponse.json({ error: 'creatorId required' }, { status: 400 });
      }
      const split = await RevenueSplitService.setCreatorSplit({
        creatorId,
        platformFeePercent,
        agencyId,
        agencyFeePercent,
        agencyName,
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
        notes,
        createdBy: user.id,
      });
      return NextResponse.json({ split });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Revenue Splits POST]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
