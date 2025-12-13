import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { menuPurchases, notifications, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/creator/orders/[orderId]/fulfill
 * Mark an order as fulfilled
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { note } = body;

    // Verify ownership and get order
    const order = await db.query.menuPurchases.findFirst({
      where: and(
        eq(menuPurchases.id, orderId),
        eq(menuPurchases.creatorId, user.id)
      ),
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'fulfilled') {
      return NextResponse.json({ error: 'Order already fulfilled' }, { status: 400 });
    }

    // Get creator info for notification
    const creator = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { username: true, displayName: true },
    });

    // Mark as fulfilled
    const [updatedOrder] = await db
      .update(menuPurchases)
      .set({
        status: 'fulfilled',
        fulfilledAt: new Date(),
        fulfillmentNote: note || null,
        updatedAt: new Date(),
      })
      .where(eq(menuPurchases.id, orderId))
      .returning();

    // Notify the buyer that their order has been fulfilled
    await db.insert(notifications).values({
      userId: order.buyerId,
      type: 'order_fulfilled',
      title: 'Order Fulfilled!',
      message: `@${creator?.username || 'Creator'} has fulfilled your order for "${order.itemLabel}"${note ? `: "${note}"` : ''}`,
      metadata: JSON.stringify({
        orderId: order.id,
        itemLabel: order.itemLabel,
        creatorId: user.id,
        fulfillmentNote: note,
      }),
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Error fulfilling order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fulfill order' },
      { status: 500 }
    );
  }
}
