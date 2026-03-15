import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, cloudLockedMessages, cloudLockedMessageRecipients, cloudLockedMessageItems, wallets, walletTransactions } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Unlock a locked message (buyer pays to see content)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await rateLimit(request, 'financial');
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });
    }

    const { id: messageId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check recipient record exists and not already unlocked
    const recipient = await db.query.cloudLockedMessageRecipients.findFirst({
      where: and(
        eq(cloudLockedMessageRecipients.messageId, messageId),
        eq(cloudLockedMessageRecipients.recipientId, user.id),
      ),
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Locked message not found' }, { status: 404 });
    }

    if (recipient.unlocked) {
      return NextResponse.json({ error: 'Already unlocked' }, { status: 409 });
    }

    // Get message details
    const message = await db.query.cloudLockedMessages.findFirst({
      where: eq(cloudLockedMessages.id, messageId),
      with: { items: { with: { item: true } } },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const price = message.priceCoins;

    // Check buyer balance
    const buyerWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    if (!buyerWallet || buyerWallet.balance < price) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }

    const idempotencyKey = `cloud_lm_${user.id}_${messageId}_${nanoid(8)}`;

    // Debit buyer
    const [buyerTx] = await db.insert(walletTransactions).values({
      userId: user.id,
      amount: -price,
      type: 'cloud_locked_message',
      status: 'completed',
      description: 'Unlocked content',
      idempotencyKey,
      metadata: JSON.stringify({ lockedMessageId: messageId, creatorId: message.creatorId }),
    }).returning();

    // Credit creator
    await db.insert(walletTransactions).values({
      userId: message.creatorId,
      amount: price,
      type: 'cloud_locked_message_earnings',
      status: 'completed',
      description: 'Locked content sale',
      idempotencyKey: `${idempotencyKey}_earnings`,
      relatedTransactionId: buyerTx.id,
      metadata: JSON.stringify({ lockedMessageId: messageId, buyerId: user.id }),
    });

    // Update wallets
    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} - ${price}`, updatedAt: new Date() })
      .where(eq(wallets.userId, user.id));

    await db.update(wallets)
      .set({ balance: sql`${wallets.balance} + ${price}`, updatedAt: new Date() })
      .where(eq(wallets.userId, message.creatorId));

    // Mark as unlocked
    await db.update(cloudLockedMessageRecipients)
      .set({
        unlocked: true,
        unlockedAt: new Date(),
        transactionId: buyerTx.id,
      })
      .where(eq(cloudLockedMessageRecipients.id, recipient.id));

    // Update message stats
    await db.update(cloudLockedMessages)
      .set({
        unlockCount: sql`${cloudLockedMessages.unlockCount} + 1`,
        totalEarnings: sql`${cloudLockedMessages.totalEarnings} + ${price}`,
      })
      .where(eq(cloudLockedMessages.id, messageId));

    // Return unlocked content
    const unlockedItems = message.items.map(mi => ({
      id: mi.item.id,
      type: mi.item.type,
      fileUrl: mi.item.fileUrl,
      thumbnailUrl: mi.item.thumbnailUrl,
      durationSeconds: mi.item.durationSeconds,
    }));

    return NextResponse.json({
      unlocked: true,
      items: unlockedItems,
      coinsSpent: price,
    });
  } catch (error: any) {
    console.error('[CLOUD LOCKED MESSAGE UNLOCK]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
