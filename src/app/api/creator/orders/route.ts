import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { menuPurchases, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/orders
 * Get pending orders for the authenticated creator
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const orders = await db.query.menuPurchases.findMany({
      where: and(
        eq(menuPurchases.creatorId, user.id),
        eq(menuPurchases.status, status)
      ),
      orderBy: [desc(menuPurchases.createdAt)],
    });

    // Get buyer info for each order
    const ordersWithBuyers = await Promise.all(
      orders.map(async (order) => {
        const buyer = await db.query.users.findFirst({
          where: eq(users.id, order.buyerId),
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        });
        return {
          ...order,
          buyer,
        };
      })
    );

    return NextResponse.json({ orders: ordersWithBuyers });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
