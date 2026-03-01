import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users } from '@/lib/data/system';
import { tipMenuItems } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/tip-menu
 * Get all tip menu items for the authenticated creator
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.query.tipMenuItems.findMany({
      where: eq(tipMenuItems.creatorId, user.id),
      orderBy: [asc(tipMenuItems.displayOrder), asc(tipMenuItems.createdAt)],
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error fetching tip menu:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tip menu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creator/tip-menu
 * Create a new menu item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify creator role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });
    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can manage tip menu items' }, { status: 403 });
    }

    const body = await request.json();
    const { label, emoji, price, description, itemCategory, fulfillmentType, digitalContentUrl } = body;

    if (!label || typeof price !== 'number' || price < 1) {
      return NextResponse.json(
        { error: 'Label and price (minimum 1) are required' },
        { status: 400 }
      );
    }

    // Validate digital content URL for digital items
    if (fulfillmentType === 'digital' && !digitalContentUrl) {
      return NextResponse.json(
        { error: 'Digital products require a download URL' },
        { status: 400 }
      );
    }

    // Get current max display order
    const existingItems = await db.query.tipMenuItems.findMany({
      where: eq(tipMenuItems.creatorId, user.id),
      columns: { displayOrder: true },
    });
    const maxOrder = existingItems.reduce((max, item) => Math.max(max, item.displayOrder), -1);

    const [item] = await db
      .insert(tipMenuItems)
      .values({
        creatorId: user.id,
        label,
        emoji: emoji || null,
        price,
        description: description || null,
        itemCategory: itemCategory || 'interaction',
        fulfillmentType: fulfillmentType || 'instant',
        digitalContentUrl: fulfillmentType === 'digital' ? digitalContentUrl : null,
        displayOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
