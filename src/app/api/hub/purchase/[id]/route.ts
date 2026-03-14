import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, hubItems, hubPurchases, wallets, walletTransactions } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Purchase a single Hub item
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

    const { id: itemId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the item
    const item = await db.query.hubItems.findFirst({
      where: and(eq(hubItems.id, itemId), eq(hubItems.status, 'live')),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or not available' }, { status: 404 });
    }

    if (!item.priceCoins || item.priceCoins <= 0) {
      return NextResponse.json({ error: 'Item has no price' }, { status: 400 });
    }

    // Can't buy your own content
    if (item.creatorId === user.id) {
      return NextResponse.json({ error: 'Cannot purchase your own content' }, { status: 400 });
    }

    // Check if already purchased
    const existing = await db.query.hubPurchases.findFirst({
      where: and(
        eq(hubPurchases.buyerId, user.id),
        eq(hubPurchases.itemId, itemId),
      ),
    });

    if (existing) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 409 });
    }

    const idempotencyKey = `hub_item_${user.id}_${itemId}_${nanoid(8)}`;
    const price = item.priceCoins;

    // Check buyer balance
    const buyerWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    if (!buyerWallet || buyerWallet.balance < price) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }

    // Execute purchase in transaction
    // Debit buyer
    const [buyerTx] = await db.insert(walletTransactions).values({
      userId: user.id,
      amount: -price,
      type: 'hub_purchase',
      status: 'completed',
      description: `Drops item purchase`,
      idempotencyKey,
      metadata: JSON.stringify({ itemId, creatorId: item.creatorId }),
    }).returning();

    // Credit creator
    const [creatorTx] = await db.insert(walletTransactions).values({
      userId: item.creatorId,
      amount: price,
      type: 'hub_earnings',
      status: 'completed',
      description: `Drops item sale`,
      idempotencyKey: `${idempotencyKey}_earnings`,
      relatedTransactionId: buyerTx.id,
      metadata: JSON.stringify({ itemId, buyerId: user.id }),
    }).returning();

    // Update wallets
    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} - ${price}`, updatedAt: new Date() })
      .where(eq(wallets.userId, user.id));

    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} + ${price}`, updatedAt: new Date() })
      .where(eq(wallets.userId, item.creatorId));

    // Record purchase
    const [purchase] = await db.insert(hubPurchases).values({
      buyerId: user.id,
      creatorId: item.creatorId,
      itemId,
      coinsSpent: price,
      transactionId: buyerTx.id,
      idempotencyKey,
    }).returning();

    return NextResponse.json({ purchase, item });
  } catch (error: any) {
    console.error('[HUB PURCHASE ITEM]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
