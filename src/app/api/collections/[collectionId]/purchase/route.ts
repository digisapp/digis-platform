import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections, collectionPurchases, wallets, walletTransactions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/collections/[collectionId]/purchase
 * Purchase a collection (fan pays, creator earns)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { collectionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    const { ok, error: rateLimitError } = await rateLimitFinancial(user.id, 'purchase');
    if (!ok) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || !collection.isPublished) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Creator gets free access
    if (user.id === collection.creatorId) {
      return NextResponse.json({ hasAccess: true, alreadyOwner: true });
    }

    // Free collection - use transaction for atomicity
    if (collection.priceCoins === 0) {
      const result = await db.transaction(async (tx) => {
        // Check duplicate inside transaction
        const existing = await tx.query.collectionPurchases.findFirst({
          where: and(
            eq(collectionPurchases.collectionId, collectionId),
            eq(collectionPurchases.userId, user.id),
          ),
        });

        if (existing) {
          return { alreadyPurchased: true };
        }

        await tx.insert(collectionPurchases).values({
          collectionId,
          userId: user.id,
          coinsSpent: 0,
        });

        await tx
          .update(collections)
          .set({
            purchaseCount: sql`${collections.purchaseCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(collections.id, collectionId));

        return { charged: 0 };
      });

      if ('alreadyPurchased' in result) {
        return NextResponse.json({ hasAccess: true, alreadyPurchased: true });
      }

      return NextResponse.json({ hasAccess: true, charged: 0 });
    }

    // Paid collection - double-entry transaction with proper locking
    const result = await db.transaction(async (tx) => {
      // Check duplicate INSIDE transaction to prevent race condition
      const existing = await tx.query.collectionPurchases.findFirst({
        where: and(
          eq(collectionPurchases.collectionId, collectionId),
          eq(collectionPurchases.userId, user.id),
        ),
      });

      if (existing) {
        return { alreadyPurchased: true };
      }

      // Lock buyer wallet
      const [buyerWallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, user.id))
        .for('update');

      if (!buyerWallet || buyerWallet.balance - buyerWallet.heldBalance < collection.priceCoins) {
        throw new Error('Insufficient balance');
      }

      // Debit buyer
      const [debitTx] = await tx
        .insert(walletTransactions)
        .values({
          userId: user.id,
          amount: -collection.priceCoins,
          type: 'collection_purchase',
          status: 'completed',
          description: `Purchased collection: ${collection.title}`,
          idempotencyKey: `collection-purchase-${user.id}-${collectionId}`,
        })
        .onConflictDoNothing()
        .returning();

      if (!debitTx) {
        // Idempotency key conflict - already processed
        return { alreadyPurchased: true };
      }

      // Credit creator
      const [creditTx] = await tx
        .insert(walletTransactions)
        .values({
          userId: collection.creatorId,
          amount: collection.priceCoins,
          type: 'collection_earnings',
          status: 'completed',
          description: `Collection sale: ${collection.title}`,
          idempotencyKey: `collection-sale-${collection.creatorId}-${collectionId}-${user.id}`,
          relatedTransactionId: debitTx.id,
        })
        .returning();

      // Update debit with related transaction
      await tx
        .update(walletTransactions)
        .set({ relatedTransactionId: creditTx.id })
        .where(eq(walletTransactions.id, debitTx.id));

      // Update buyer wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${collection.priceCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, user.id));

      // Lock and update creator wallet
      await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, collection.creatorId))
        .for('update');

      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${collection.priceCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, collection.creatorId));

      // Create purchase record
      await tx.insert(collectionPurchases).values({
        collectionId,
        userId: user.id,
        coinsSpent: collection.priceCoins,
        transactionId: debitTx.id,
      });

      // Update collection stats
      await tx
        .update(collections)
        .set({
          purchaseCount: sql`${collections.purchaseCount} + 1`,
          totalEarnings: sql`${collections.totalEarnings} + ${collection.priceCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, collectionId));

      return { charged: collection.priceCoins, transactionId: debitTx.id };
    });

    if ('alreadyPurchased' in result) {
      return NextResponse.json({ hasAccess: true, alreadyPurchased: true });
    }

    return NextResponse.json({ hasAccess: true, ...result });
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }
    console.error('Error purchasing collection:', error);
    return NextResponse.json(
      { error: 'Failed to purchase collection' },
      { status: 500 }
    );
  }
}
