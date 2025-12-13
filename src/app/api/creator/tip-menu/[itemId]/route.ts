import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { tipMenuItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/creator/tip-menu/[itemId]
 * Update a tip menu item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { label, emoji, price, description, isActive, displayOrder, itemCategory, fulfillmentType, digitalContentUrl } = body;

    // Verify ownership
    const existing = await db.query.tipMenuItems.findFirst({
      where: and(
        eq(tipMenuItems.id, itemId),
        eq(tipMenuItems.creatorId, user.id)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Validate digital content URL for digital items
    const newFulfillmentType = fulfillmentType ?? existing.fulfillmentType;
    if (newFulfillmentType === 'digital' && !digitalContentUrl && !existing.digitalContentUrl) {
      return NextResponse.json(
        { error: 'Digital products require a download URL' },
        { status: 400 }
      );
    }

    const updates: any = { updatedAt: new Date() };
    if (label !== undefined) updates.label = label;
    if (emoji !== undefined) updates.emoji = emoji || null;
    if (price !== undefined) updates.price = price;
    if (description !== undefined) updates.description = description || null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (itemCategory !== undefined) updates.itemCategory = itemCategory;
    if (fulfillmentType !== undefined) updates.fulfillmentType = fulfillmentType;
    if (digitalContentUrl !== undefined) updates.digitalContentUrl = fulfillmentType === 'digital' ? digitalContentUrl : null;

    const [item] = await db
      .update(tipMenuItems)
      .set(updates)
      .where(eq(tipMenuItems.id, itemId))
      .returning();

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error updating tip menu item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tip menu item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/creator/tip-menu/[itemId]
 * Delete a tip menu item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and delete
    const result = await db
      .delete(tipMenuItems)
      .where(and(
        eq(tipMenuItems.id, itemId),
        eq(tipMenuItems.creatorId, user.id)
      ))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting tip menu item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete tip menu item' },
      { status: 500 }
    );
  }
}
