import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, hubPacks, hubPackItems, hubItems } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Add items to a pack
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pack = await db.query.hubPacks.findFirst({
      where: and(eq(hubPacks.id, id), eq(hubPacks.creatorId, user.id)),
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
    }

    // Verify items belong to creator
    const items = await db.select()
      .from(hubItems)
      .where(and(eq(hubItems.creatorId, user.id)));

    const ownedIds = new Set(items.map(i => i.id));
    const validIds = itemIds.filter((id: string) => ownedIds.has(id));

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 400 });
    }

    // Get current max sort order
    const existing = await db.select()
      .from(hubPackItems)
      .where(eq(hubPackItems.packId, id));

    const maxOrder = existing.length > 0
      ? Math.max(...existing.map(e => e.sortOrder))
      : -1;

    // Filter out items already in the pack
    const existingItemIds = new Set(existing.map(e => e.itemId));
    const newIds = validIds.filter((id: string) => !existingItemIds.has(id));

    if (newIds.length === 0) {
      return NextResponse.json({ error: 'All items already in pack' }, { status: 400 });
    }

    // Add new items
    await db.insert(hubPackItems).values(
      newIds.map((itemId: string, index: number) => ({
        packId: id,
        itemId,
        sortOrder: maxOrder + 1 + index,
      }))
    );

    // Update item count
    await db.update(hubPacks)
      .set({
        itemCount: sql`${hubPacks.itemCount} + ${newIds.length}`,
        updatedAt: new Date(),
      })
      .where(eq(hubPacks.id, id));

    return NextResponse.json({ added: newIds.length });
  } catch (error: any) {
    console.error('[HUB PACK ITEMS POST]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * DELETE - Remove items from a pack
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pack = await db.query.hubPacks.findFirst({
      where: and(eq(hubPacks.id, id), eq(hubPacks.creatorId, user.id)),
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
    }

    // Remove items from pack
    let removed = 0;
    for (const itemId of itemIds) {
      const result = await db.delete(hubPackItems)
        .where(and(
          eq(hubPackItems.packId, id),
          eq(hubPackItems.itemId, itemId),
        ));
      removed++;
    }

    // Update item count
    const remaining = await db.select()
      .from(hubPackItems)
      .where(eq(hubPackItems.packId, id));

    await db.update(hubPacks)
      .set({
        itemCount: remaining.length,
        updatedAt: new Date(),
      })
      .where(eq(hubPacks.id, id));

    return NextResponse.json({ removed, remaining: remaining.length });
  } catch (error: any) {
    console.error('[HUB PACK ITEMS DELETE]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
