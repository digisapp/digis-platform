import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/wallet/wallet-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WELCOME_BONUS_COINS = 10;

/**
 * POST /api/wallet/welcome-bonus
 * Credits free coins to a new fan's wallet (one-time only).
 * Uses idempotency key `welcome_bonus_{userId}` to prevent double claims.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Idempotency key ensures this can only be claimed once per user
    const idempotencyKey = `welcome_bonus_${user.id}`;

    const transaction = await WalletService.createTransaction({
      userId: user.id,
      amount: WELCOME_BONUS_COINS,
      type: 'promo_credit',
      description: 'Welcome bonus — free coins for new fans',
      idempotencyKey,
      auditContext: {
        requestId: `welcome_${user.id}`,
      },
    });

    return NextResponse.json({
      status: 'claimed',
      coins: WELCOME_BONUS_COINS,
      transactionId: transaction.id,
    });
  } catch (error: any) {
    console.error('[Welcome Bonus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to claim bonus' },
      { status: 500 }
    );
  }
}
