import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections, collectionPurchases, collectionProgress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/collections/[collectionId]
 * Get collection with items and access check
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { collectionId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.position)],
          with: {
            content: {
              columns: { id: true, title: true, thumbnailUrl: true, contentType: true, durationSeconds: true, description: true },
            },
            vod: {
              columns: { id: true, title: true, thumbnailUrl: true, duration: true, description: true },
            },
          },
        },
        creator: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!collection.isPublished && collection.creatorId !== user?.id) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check access
    let hasAccess = false;
    let progress = null;

    if (user) {
      // Creator always has access
      if (user.id === collection.creatorId) {
        hasAccess = true;
      } else if (collection.priceCoins === 0) {
        hasAccess = true;
      } else {
        const purchase = await db.query.collectionPurchases.findFirst({
          where: and(
            eq(collectionPurchases.collectionId, collectionId),
            eq(collectionPurchases.userId, user.id),
          ),
        });
        hasAccess = !!purchase;
      }

      // Get progress
      progress = await db.query.collectionProgress.findFirst({
        where: and(
          eq(collectionProgress.collectionId, collectionId),
          eq(collectionProgress.userId, user.id),
        ),
      });
    }

    return NextResponse.json({
      collection,
      hasAccess,
      progress,
    });
  } catch (error: any) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collections/[collectionId]
 * Update collection (creator only)
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
    const { title, description, thumbnailUrl, priceCoins, subscribersOnly, isPublished } = body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
    if (priceCoins !== undefined) updates.priceCoins = priceCoins;
    if (subscribersOnly !== undefined) updates.subscribersOnly = subscribersOnly;
    if (isPublished !== undefined) updates.isPublished = isPublished;

    const [updated] = await db
      .update(collections)
      .set(updates)
      .where(eq(collections.id, collectionId))
      .returning();

    return NextResponse.json({ collection: updated });
  } catch (error: any) {
    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update collection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[collectionId]
 * Delete collection (creator only)
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

    // If collection has purchases, soft-delete by unpublishing
    if (collection.purchaseCount > 0) {
      await db
        .update(collections)
        .set({ isPublished: false, updatedAt: new Date() })
        .where(eq(collections.id, collectionId));

      return NextResponse.json({ deleted: false, unpublished: true });
    }

    // Hard delete if no purchases
    await db.delete(collections).where(eq(collections.id, collectionId));

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
