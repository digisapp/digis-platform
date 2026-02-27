import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests, wallets, creatorBankingInfo, spendHolds, creatorPayoneerInfo } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { MIN_PAYOUT_COINS, MIN_PAYOUT_USD, formatCoinsAsUSD } from '@/lib/stripe/config';
import { sendPayoutRequestEmail } from '@/lib/email/payout-notifications';
import { payoutRequestSchema, validateBody } from '@/lib/validation/schemas';
import { isPayoneerAvailable } from '@/lib/payoneer/service';
import { withOriginGuard } from '@/lib/security/withOriginGuard';
import { rateLimitCritical } from '@/lib/rate-limit';
import * as Sentry from '@sentry/nextjs';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/wallet/payouts/request - Creator requests a payout
// Protected with Origin/Referer validation for CSRF mitigation (money movement)
export const POST = withOriginGuard(async (request: Request) => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit payout requests (5/min, 30/hour)
    const rateCheck = await rateLimitCritical(user.id, 'wallet');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    // Check if user is creator
    const profileResponse = await fetch(new URL('/api/user/profile', request.url), {
      headers: { cookie: request.headers.get('cookie') || '' }
    });
    const profile = await profileResponse.json();

    if (profile.user?.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can request payouts' }, { status: 403 });
    }

    // Validate input with Zod
    const validation = await validateBody(request, payoutRequestSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { amount, method } = validation.data;

    // Validate amount using new minimum threshold
    if (amount < MIN_PAYOUT_COINS) {
      return NextResponse.json({
        error: `Minimum payout is ${MIN_PAYOUT_COINS.toLocaleString()} coins (${formatCoinsAsUSD(MIN_PAYOUT_COINS)})`
      }, { status: 400 });
    }

    // Validate payout method and required info
    let banking = null;
    let payoneerInfo = null;

    if (method === 'bank_transfer') {
      // Check if creator has banking info for bank transfer
      banking = await db.query.creatorBankingInfo.findFirst({
        where: eq(creatorBankingInfo.creatorId, user.id),
      });

      if (!banking) {
        return NextResponse.json({ error: 'Please add banking information first' }, { status: 400 });
      }
    } else if (method === 'payoneer') {
      // Check if creator has active Payoneer account
      const hasPayoneer = await isPayoneerAvailable(user.id);
      if (!hasPayoneer) {
        return NextResponse.json({ error: 'Please connect your Payoneer account first' }, { status: 400 });
      }

      payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
        where: eq(creatorPayoneerInfo.creatorId, user.id),
      });
    }

    // Use transaction with row-level locking to prevent race conditions
    // This ensures only one payout request can be created at a time per user
    const payout = await db.transaction(async (tx) => {
      // Lock the user's wallet row to serialize payout requests
      const lockedWalletResult = await tx.execute(
        sql`SELECT * FROM wallets WHERE user_id = ${user.id} FOR UPDATE`
      );

      // Drizzle execute returns array directly
      const walletRows = lockedWalletResult as unknown as Array<{
        id: string;
        user_id: string;
        balance: number;
        held_balance: number
      }>;
      const wallet = walletRows[0];

      // Check AVAILABLE balance (balance - heldBalance) to prevent overspending
      const availableBalance = wallet ? wallet.balance - wallet.held_balance : 0;
      if (!wallet || availableBalance < amount) {
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

      // Create a balance hold to reserve the payout amount
      const [hold] = await tx.insert(spendHolds).values({
        userId: user.id,
        amount,
        purpose: 'payout',
        status: 'active',
      }).returning();

      // Update wallet held_balance
      await tx
        .update(wallets)
        .set({
          heldBalance: sql`${wallets.heldBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, user.id));

      // Create payout request with hold reference in metadata
      const [newPayout] = await tx.insert(payoutRequests).values({
        creatorId: user.id,
        amount,
        payoutMethod: method,
        bankingInfoId: method === 'bank_transfer' ? banking?.id : null,
        status: 'pending',
        metadata: JSON.stringify({
          holdId: hold.id,
          method,
          ...(method === 'payoneer' && payoneerInfo ? { payeeId: payoneerInfo.payeeId } : {}),
        }),
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
        method: payout.payoutMethod,
        requestedAt: payout.requestedAt,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating payout request:', error);
    // Handle known error types from transaction
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage === 'Insufficient balance' ||
        errorMessage.includes('pending payout') ||
        errorMessage.includes('being processed')) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    Sentry.captureException(error, {
      tags: { service: 'payout', route: 'POST /api/wallet/payouts/request' },
    });
    return NextResponse.json(
      { error: 'Failed to create payout request. Please try again.' },
      { status: 500 }
    );
  }
});
