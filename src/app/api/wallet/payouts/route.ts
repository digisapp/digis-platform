import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests } from '@/lib/data/system';
import { eq, desc } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/wallet/payouts - Get creator's payout history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payouts = await db.query.payoutRequests.findMany({
      where: eq(payoutRequests.creatorId, user.id),
      orderBy: [desc(payoutRequests.requestedAt)],
      limit: 50,
    });

    return NextResponse.json({
      payouts: payouts.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        completedAt: p.completedAt,
        failureReason: p.failureReason,
      }))
    });
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
