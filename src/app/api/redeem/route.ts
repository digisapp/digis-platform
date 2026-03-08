import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, redemptionCodes, wallets, walletTransactions } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { invalidateBalanceCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to redeem a code' }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Please enter a redemption code' }, { status: 400 });
    }

    // Normalize: uppercase, trim whitespace
    const normalizedCode = code.trim().toUpperCase();

    // Find the code
    const redemptionCode = await db.query.redemptionCodes.findFirst({
      where: eq(redemptionCodes.code, normalizedCode),
    });

    if (!redemptionCode) {
      return NextResponse.json({ error: 'Invalid code. Please check and try again.' }, { status: 404 });
    }

    if (redemptionCode.isRedeemed) {
      return NextResponse.json({ error: 'This code has already been used' }, { status: 409 });
    }

    if (redemptionCode.expiresAt && new Date() > redemptionCode.expiresAt) {
      return NextResponse.json({ error: 'This code has expired' }, { status: 410 });
    }

    // Redeem within a transaction
    const idempotencyKey = `redeem-${redemptionCode.id}-${user.id}`;

    await db.transaction(async (tx) => {
      // Mark code as redeemed
      await tx.update(redemptionCodes)
        .set({
          isRedeemed: true,
          redeemedByUserId: user.id,
          redeemedAt: new Date(),
        })
        .where(eq(redemptionCodes.id, redemptionCode.id));

      // Lock wallet for update
      const walletRows = await tx.execute(
        sql`SELECT * FROM wallets WHERE user_id = ${user.id} FOR UPDATE`
      ) as unknown as Array<{ id: string; balance: number }>;

      if (walletRows.length === 0) {
        // Create wallet
        await tx.insert(wallets).values({
          userId: user.id,
          balance: redemptionCode.coinAmount,
          heldBalance: 0,
        });
      } else {
        // Credit coins
        await tx.update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${redemptionCode.coinAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, user.id));
      }

      // Record transaction
      await tx.insert(walletTransactions).values({
        userId: user.id,
        amount: redemptionCode.coinAmount,
        type: 'promo_credit',
        status: 'completed',
        description: `Redeemed code: ${normalizedCode}`,
        idempotencyKey,
        metadata: JSON.stringify({
          codeId: redemptionCode.id,
          code: normalizedCode,
          batchName: redemptionCode.batchName,
        }),
      });
    });

    // Invalidate cached balance
    await invalidateBalanceCache(user.id);

    return NextResponse.json({
      success: true,
      coinsAdded: redemptionCode.coinAmount,
      message: `${redemptionCode.coinAmount} coins added to your wallet!`,
    });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
