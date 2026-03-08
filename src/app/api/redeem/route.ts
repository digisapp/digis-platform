import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, redemptionCodes, codeRedemptions, wallets, walletTransactions } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
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

    if (redemptionCode.expiresAt && new Date() > redemptionCode.expiresAt) {
      return NextResponse.json({ error: 'This code has expired' }, { status: 410 });
    }

    // Check if max redemptions reached
    if (redemptionCode.maxRedemptions && redemptionCode.redemptionCount >= redemptionCode.maxRedemptions) {
      return NextResponse.json({ error: 'This code has reached its maximum number of uses' }, { status: 409 });
    }

    // Check if this user already redeemed this code
    const existingRedemption = await db.query.codeRedemptions.findFirst({
      where: and(
        eq(codeRedemptions.codeId, redemptionCode.id),
        eq(codeRedemptions.userId, user.id),
      ),
    });

    if (existingRedemption) {
      return NextResponse.json({ error: 'You have already redeemed this code' }, { status: 409 });
    }

    // Redeem within a transaction
    const idempotencyKey = `redeem-${redemptionCode.id}-${user.id}`;

    await db.transaction(async (tx) => {
      // Record the redemption (unique constraint prevents duplicates)
      await tx.insert(codeRedemptions).values({
        codeId: redemptionCode.id,
        userId: user.id,
      });

      // Increment redemption count
      await tx.update(redemptionCodes)
        .set({
          redemptionCount: sql`${redemptionCodes.redemptionCount} + 1`,
        })
        .where(eq(redemptionCodes.id, redemptionCode.id));

      // Lock wallet for update
      const walletRows = await tx.execute(
        sql`SELECT * FROM wallets WHERE user_id = ${user.id} FOR UPDATE`
      ) as unknown as Array<{ id: string; balance: number }>;

      if (walletRows.length === 0) {
        await tx.insert(wallets).values({
          userId: user.id,
          balance: redemptionCode.coinAmount,
          heldBalance: 0,
        });
      } else {
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
