import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { WalletService } from '@/lib/wallet/wallet-service';
import { purchaseVODAccess } from '@/lib/vods/vod-access';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/nextjs';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Purchase access to a VOD
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { vodId } = await params;

    // Get VOD details
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!vod) {
      return NextResponse.json(
        { error: 'VOD not found' },
        { status: 404 }
      );
    }

    // Can't purchase your own VOD
    if (vod.creatorId === user.id) {
      return NextResponse.json(
        { error: 'You cannot purchase your own VOD' },
        { status: 400 }
      );
    }

    // Can't purchase a free/public VOD
    if (vod.isPublic || vod.priceCoins === 0) {
      return NextResponse.json(
        { error: 'This VOD is free to watch' },
        { status: 400 }
      );
    }

    const price = vod.priceCoins;

    // Generate unique transaction ID for this purchase attempt
    const txId = uuidv4();

    try {
      // Deduct coins from buyer's wallet
      await WalletService.createTransaction({
        userId: user.id,
        amount: -price,
        type: 'ppv_unlock',
        description: `Purchased VOD: ${vod.title}`,
        idempotencyKey: `vod_purchase_${vodId}_${user.id}_${txId}`,
      });
    } catch (walletError: any) {
      return NextResponse.json(
        { error: walletError.message || 'Insufficient balance' },
        { status: 400 }
      );
    }

    // Record the purchase
    const purchaseResult = await purchaseVODAccess({
      vodId,
      userId: user.id,
    });

    if (!purchaseResult.success) {
      // Refund if purchase recording fails - use same txId for tracing
      await WalletService.createTransaction({
        userId: user.id,
        amount: price,
        type: 'refund',
        description: `Refund for failed VOD purchase: ${vod.title}`,
        idempotencyKey: `vod_refund_${vodId}_${user.id}_${txId}`,
      });

      return NextResponse.json(
        { error: purchaseResult.error || 'Failed to complete purchase' },
        { status: 500 }
      );
    }

    // Credit the creator - use same txId for complete audit trail
    await WalletService.createTransaction({
      userId: vod.creatorId,
      amount: price,
      type: 'creator_payout',
      description: `VOD sale: ${vod.title}`,
      idempotencyKey: `vod_sale_${vodId}_${user.id}_${txId}`,
    });

    // Get updated balance
    const newBalance = await WalletService.getBalance(user.id);

    console.log(`[VOD Purchase] User ${user.id} purchased VOD ${vodId} for ${price} coins`);

    return NextResponse.json({
      success: true,
      message: 'VOD access purchased successfully',
      newBalance,
    });
  } catch (error: any) {
    console.error('[VOD Purchase] Error:', error);
    Sentry.captureException(error, {
      tags: { service: 'vod-purchase', route: 'POST /api/vods/[vodId]/purchase' },
      extra: { vodId: (await params).vodId },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to purchase VOD access' },
      { status: 500 }
    );
  }
}
