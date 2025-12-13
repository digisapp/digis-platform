import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
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
      { error: error.message || 'Failed to fetch tip menu' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creator/tip-menu
 * Create a new tip menu item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { label, emoji, price, description } = body;

    if (!label || typeof price !== 'number' || price < 1) {
      return NextResponse.json(
        { error: 'Label and price (minimum 1) are required' },
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
        displayOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error creating tip menu item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tip menu item' },
      { status: 500 }
    );
  }
}
