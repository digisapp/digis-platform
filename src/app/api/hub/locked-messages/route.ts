import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, hubItems, hubLockedMessages, hubLockedMessageItems, hubLockedMessageRecipients, follows, walletTransactions } from '@/lib/data/system';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { NotificationService } from '@/lib/services/notification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - List creator's sent locked messages
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const messages = await db.query.hubLockedMessages.findMany({
      where: eq(hubLockedMessages.creatorId, user.id),
      orderBy: [desc(hubLockedMessages.sentAt)],
      with: {
        items: { with: { item: true } },
      },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('[HUB LOCKED MESSAGES GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * POST - Send locked content to fans
 * Body: { itemIds, priceCoins, messageText?, segment, recipientIds? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can send locked messages' }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds, priceCoins, messageText, segment, recipientIds } = body;

    // Validate
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds required' }, { status: 400 });
    }

    if (typeof priceCoins !== 'number' || priceCoins <= 0 || !Number.isInteger(priceCoins)) {
      return NextResponse.json({ error: 'priceCoins must be a positive integer' }, { status: 400 });
    }

    if (!['individual', 'top_fans', 'all_followers'].includes(segment)) {
      return NextResponse.json({ error: 'segment must be individual, top_fans, or all_followers' }, { status: 400 });
    }

    // Verify items belong to creator
    const items = await db.select()
      .from(hubItems)
      .where(and(eq(hubItems.creatorId, user.id), inArray(hubItems.id, itemIds)));

    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'Some items not found' }, { status: 400 });
    }

    // Determine recipients based on segment
    let recipients: string[] = [];

    if (segment === 'individual') {
      if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
        return NextResponse.json({ error: 'recipientIds required for individual segment' }, { status: 400 });
      }
      recipients = recipientIds;
    } else if (segment === 'top_fans') {
      // Top fans = users who have spent the most on this creator's content
      const topFans: any[] = await db.execute(sql`
        SELECT buyer_id, SUM(coins_spent) as total_spent
        FROM hub_purchases
        WHERE creator_id = ${user.id}
        GROUP BY buyer_id
        ORDER BY total_spent DESC
        LIMIT 50
      `);
      recipients = topFans.map(r => r.buyer_id);

      if (recipients.length === 0) {
        // Fallback to followers if no purchases yet
        const followerList = await db.query.follows.findMany({
          where: eq(follows.followingId, user.id),
          columns: { followerId: true },
        });
        recipients = followerList.map(f => f.followerId).slice(0, 50);
      }
    } else if (segment === 'all_followers') {
      const followerList = await db.query.follows.findMany({
        where: eq(follows.followingId, user.id),
        columns: { followerId: true },
      });
      recipients = followerList.map(f => f.followerId);
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found for this segment' }, { status: 400 });
    }

    // Create locked message
    const [lockedMessage] = await db.insert(hubLockedMessages).values({
      creatorId: user.id,
      messageText: messageText || null,
      priceCoins,
      segment,
      recipientCount: recipients.length,
    }).returning();

    // Attach items
    await db.insert(hubLockedMessageItems).values(
      itemIds.map((itemId: string) => ({
        messageId: lockedMessage.id,
        itemId,
      }))
    );

    // Create recipient records
    await db.insert(hubLockedMessageRecipients).values(
      recipients.map(recipientId => ({
        messageId: lockedMessage.id,
        recipientId,
      }))
    );

    // Notify recipients (fire-and-forget)
    const creatorName = dbUser.displayName || dbUser.username || 'A creator';
    const itemCount = itemIds.length;
    const notifPromises = recipients.map(recipientId =>
      NotificationService.sendNotification(
        recipientId,
        'message',
        `${creatorName} sent you locked content`,
        `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · Unlock for ${priceCoins} coins`,
        `/chats`,
        dbUser.avatarUrl || undefined,
        { creatorId: user.id, lockedMessageId: lockedMessage.id, type: 'hub_locked_message' }
      ).catch(err => console.error('[LOCKED MSG] Notification error:', err.message))
    );
    Promise.all(notifPromises);

    return NextResponse.json({
      lockedMessage,
      recipientCount: recipients.length,
      itemCount: itemIds.length,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[HUB LOCKED MESSAGES POST]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
