import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections, collectionItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/collections/[collectionId]/items/reorder
 * Reorder items in a collection (creator only)
 */
export async function PATCH(
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
    const { itemIds } = body; // Array of item IDs in new order

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
    }

    // Validate all item IDs belong to this collection
    const existingItems = await db.query.collectionItems.findMany({
      where: eq(collectionItems.collectionId, collectionId),
      columns: { id: true },
    });
    const existingIds = new Set(existingItems.map(i => i.id));
    const uniqueInput = new Set(itemIds);

    if (uniqueInput.size !== itemIds.length || !itemIds.every((id: string) => existingIds.has(id))) {
      return NextResponse.json({ error: 'Invalid item IDs' }, { status: 400 });
    }

    // Update positions in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await tx
          .update(collectionItems)
          .set({ position: i })
          .where(eq(collectionItems.id, itemIds[i]));
      }
    });

    return NextResponse.json({ reordered: true });
  } catch (error: any) {
    console.error('Error reordering collection items:', error);
    return NextResponse.json(
      { error: 'Failed to reorder items' },
      { status: 500 }
    );
  }
}
