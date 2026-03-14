import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, hubPacks, hubPurchases, wallets, walletTransactions } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Purchase a Hub pack
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await rateLimit(request, 'financial');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait.' },
        { status: 429, headers: rl.headers }
      );
    }

    const { id: packId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the pack
    const pack = await db.query.hubPacks.findFirst({
      where: and(eq(hubPacks.id, packId), eq(hubPacks.status, 'live')),
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found or not available' }, { status: 404 });
    }

    if (pack.creatorId === user.id) {
      return NextResponse.json({ error: 'Cannot purchase your own pack' }, { status: 400 });
    }

    // Check if already purchased
    const existing = await db.query.hubPurchases.findFirst({
      where: and(
        eq(hubPurchases.buyerId, user.id),
        eq(hubPurchases.packId, packId),
      ),
    });

    if (existing) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 409 });
    }

    const idempotencyKey = `hub_pack_${user.id}_${packId}_${nanoid(8)}`;
    const price = pack.priceCoins;

    // Check buyer balance
    const buyerWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    if (!buyerWallet || buyerWallet.balance < price) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }

    // Debit buyer
    const [buyerTx] = await db.insert(walletTransactions).values({
      userId: user.id,
      amount: -price,
      type: 'hub_pack_purchase',
      status: 'completed',
      description: `Drops pack purchase: ${pack.title}`,
      idempotencyKey,
      metadata: JSON.stringify({ packId, creatorId: pack.creatorId }),
    }).returning();

    // Credit creator
    await db.insert(walletTransactions).values({
      userId: pack.creatorId,
      amount: price,
      type: 'hub_pack_earnings',
      status: 'completed',
      description: `Drops pack sale: ${pack.title}`,
      idempotencyKey: `${idempotencyKey}_earnings`,
      relatedTransactionId: buyerTx.id,
      metadata: JSON.stringify({ packId, buyerId: user.id }),
    });

    // Update wallets
    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} - ${price}`, updatedAt: new Date() })
      .where(eq(wallets.userId, user.id));

    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} + ${price}`, updatedAt: new Date() })
      .where(eq(wallets.userId, pack.creatorId));

    // Record purchase
    const [purchase] = await db.insert(hubPurchases).values({
      buyerId: user.id,
      creatorId: pack.creatorId,
      packId,
      coinsSpent: price,
      transactionId: buyerTx.id,
      idempotencyKey,
    }).returning();

    // Update pack stats
    await db.update(hubPacks)
      .set({
        purchaseCount: sql`${hubPacks.purchaseCount} + 1`,
        totalEarnings: sql`${hubPacks.totalEarnings} + ${price}`,
        updatedAt: new Date(),
      })
      .where(eq(hubPacks.id, packId));

    return NextResponse.json({ purchase, pack });
  } catch (error: any) {
    console.error('[HUB PURCHASE PACK]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
