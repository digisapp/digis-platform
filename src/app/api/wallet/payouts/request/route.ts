import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests, wallets, creatorBankingInfo } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { MIN_PAYOUT_COINS, MIN_PAYOUT_USD, formatCoinsAsUSD } from '@/lib/stripe/config';
import { sendPayoutRequestEmail } from '@/lib/email/payout-notifications';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/wallet/payouts/request - Creator requests a payout
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is creator
    const profileResponse = await fetch(new URL('/api/user/profile', request.url), {
      headers: { cookie: request.headers.get('cookie') || '' }
    });
    const profile = await profileResponse.json();

    if (profile.user?.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can request payouts' }, { status: 403 });
    }

    const { amount } = await request.json();

    // Validate amount using new minimum threshold
    if (!amount || amount < MIN_PAYOUT_COINS) {
      return NextResponse.json({
        error: `Minimum payout is ${MIN_PAYOUT_COINS.toLocaleString()} coins (${formatCoinsAsUSD(MIN_PAYOUT_COINS)})`
      }, { status: 400 });
    }

    // Check if creator has banking info
    const banking = await db.query.creatorBankingInfo.findFirst({
      where: eq(creatorBankingInfo.creatorId, user.id),
    });

    if (!banking) {
      return NextResponse.json({ error: 'Please add banking information first' }, { status: 400 });
    }

    // Check wallet balance
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Check for pending payouts
    const pendingPayout = await db.query.payoutRequests.findFirst({
      where: and(
        eq(payoutRequests.creatorId, user.id),
        eq(payoutRequests.status, 'pending')
      ),
    });

    if (pendingPayout) {
      return NextResponse.json({ error: 'You already have a pending payout request' }, { status: 400 });
    }

    // Create payout request
    const [payout] = await db.insert(payoutRequests).values({
      creatorId: user.id,
      amount,
      bankingInfoId: banking.id,
      status: 'pending',
    }).returning();

    // Send confirmation email
    try {
      await sendPayoutRequestEmail({
        creatorEmail: user.email || '',
        creatorName: profile.user?.displayName || profile.user?.username || 'Creator',
        amount,
        status: 'pending',
        requestedAt: new Date(payout.requestedAt),
      });
    } catch (emailError) {
      console.error('Failed to send payout request email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        requestedAt: payout.requestedAt,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payout request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payout request' },
      { status: 500 }
    );
  }
}
