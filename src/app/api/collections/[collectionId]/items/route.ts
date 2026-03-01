import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections, collectionItems } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/collections/[collectionId]/items
 * Add item to collection (creator only)
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

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.creatorId !== user.id) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await request.json();
    const { contentId, vodId } = body;

    if (!contentId && !vodId) {
      return NextResponse.json({ error: 'contentId or vodId is required' }, { status: 400 });
    }

    if (contentId && vodId) {
      return NextResponse.json({ error: 'Provide either contentId or vodId, not both' }, { status: 400 });
    }

    // Get current max position
    const existingItems = await db.query.collectionItems.findMany({
      where: eq(collectionItems.collectionId, collectionId),
      columns: { position: true },
    });
    const maxPosition = existingItems.reduce((max, item) => Math.max(max, item.position), -1);

    const [item] = await db.transaction(async (tx) => {
      const [newItem] = await tx
        .insert(collectionItems)
        .values({
          collectionId,
          contentId: contentId || null,
          vodId: vodId || null,
          position: maxPosition + 1,
        })
        .returning();

      await tx
        .update(collections)
        .set({
          itemCount: sql`${collections.itemCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, collectionId));

      return [newItem];
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    // Handle duplicate item
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Item already in collection' }, { status: 409 });
    }
    console.error('Error adding collection item:', error);
    return NextResponse.json(
      { error: 'Failed to add item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[collectionId]/items
 * Remove item from collection (creator only)
 */
export async function DELETE(
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

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
    });

    if (!collection || collection.creatorId !== user.id) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(collectionItems)
        .where(and(
          eq(collectionItems.id, itemId),
          eq(collectionItems.collectionId, collectionId),
        ))
        .returning();

      if (deleted.length === 0) {
        throw new Error('ITEM_NOT_FOUND');
      }

      await tx
        .update(collections)
        .set({
          itemCount: sql`GREATEST(${collections.itemCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, collectionId));

      return deleted;
    });

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    if (error.message === 'ITEM_NOT_FOUND') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    console.error('Error removing collection item:', error);
    return NextResponse.json(
      { error: 'Failed to remove item' },
      { status: 500 }
    );
  }
}
