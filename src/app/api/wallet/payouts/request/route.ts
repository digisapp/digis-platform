import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests, wallets, creatorBankingInfo } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
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

    // Check if creator has banking info (can be done outside transaction)
    const banking = await db.query.creatorBankingInfo.findFirst({
      where: eq(creatorBankingInfo.creatorId, user.id),
    });

    if (!banking) {
      return NextResponse.json({ error: 'Please add banking information first' }, { status: 400 });
    }

    // Use transaction with row-level locking to prevent race conditions
    // This ensures only one payout request can be created at a time per user
    const payout = await db.transaction(async (tx) => {
      // Lock the user's wallet row to serialize payout requests
      const lockedWalletResult = await tx.execute(
        sql`SELECT * FROM wallets WHERE user_id = ${user.id} FOR UPDATE`
      );

      const wallet = lockedWalletResult.rows[0] as {
        id: string;
        user_id: string;
        balance: number;
        held_balance: number
      } | undefined;

      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Check for pending payouts (now safe because we hold the lock)
      const pendingPayout = await tx.query.payoutRequests.findFirst({
        where: and(
          eq(payoutRequests.creatorId, user.id),
          eq(payoutRequests.status, 'pending')
        ),
      });

      if (pendingPayout) {
        throw new Error('You already have a pending payout request');
      }

      // Also check for 'processing' payouts
      const processingPayout = await tx.query.payoutRequests.findFirst({
        where: and(
          eq(payoutRequests.creatorId, user.id),
          eq(payoutRequests.status, 'processing')
        ),
      });

      if (processingPayout) {
        throw new Error('You have a payout currently being processed');
      }

      // Create payout request (now safe from concurrent duplicates)
      const [newPayout] = await tx.insert(payoutRequests).values({
        creatorId: user.id,
        amount,
        bankingInfoId: banking.id,
        status: 'pending',
      }).returning();

      return newPayout;
    });

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
