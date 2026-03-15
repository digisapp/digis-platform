import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, cloudItems, users } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Get single Drops item
 */
export async function GET(
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

    const item = await db.query.cloudItems.findFirst({
      where: and(eq(cloudItems.id, id), eq(cloudItems.creatorId, user.id)),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('[CLOUD ITEM GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * PATCH - Update Drops item (price, status)
 */
export async function PATCH(
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

    const item = await db.query.cloudItems.findFirst({
      where: and(eq(cloudItems.id, id), eq(cloudItems.creatorId, user.id)),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const body = await request.json();
    const { priceCoins, status } = body;

    const updates: Record<string, any> = {};

    // Validate and set price
    if (priceCoins !== undefined) {
      if (priceCoins !== null && (typeof priceCoins !== 'number' || priceCoins < 0 || !Number.isInteger(priceCoins))) {
        return NextResponse.json({ error: 'priceCoins must be a positive integer or null' }, { status: 400 });
      }
      updates.priceCoins = priceCoins;
    }

    // Validate and set status
    if (status !== undefined) {
      if (!['private', 'ready', 'live'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      // Can't go live without a price
      if (status === 'live' && !item.priceCoins && !updates.priceCoins) {
        return NextResponse.json({ error: 'Set a price before going live' }, { status: 400 });
      }

      updates.status = status;
      if (status === 'live' && !item.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db.update(cloudItems)
      .set(updates)
      .where(eq(cloudItems.id, id))
      .returning();

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    console.error('[CLOUD ITEM PATCH]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * DELETE - Remove Drops item and free storage
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

    const item = await db.query.cloudItems.findFirst({
      where: and(eq(cloudItems.id, id), eq(cloudItems.creatorId, user.id)),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete from storage
    const fileUrl = item.fileUrl;
    const bucket = 'drops-content';
    // Extract path from public URL
    const pathMatch = fileUrl.match(/drops-content\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from(bucket).remove([pathMatch[1]]);
    }

    // Delete from database (cascades to tags, pack items)
    await db.delete(cloudItems).where(eq(cloudItems.id, id));

    // Update storage usage
    if (item.sizeBytes) {
      await db.update(users)
        .set({
          storageUsed: sql`GREATEST(0, ${users.storageUsed} - ${Number(item.sizeBytes)})`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('[CLOUD ITEM DELETE]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
