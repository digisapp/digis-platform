import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { cloudItems, cloudPacks, cloudPackItems, cloudPurchases, users } from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch a creator's live Hub items and packs for buyers
 * ?limit=20&offset=0&type=photo|video
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  try {
    const params = await props.params;
    const username = params.username;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') as 'photo' | 'video' | null;

    // Get current user
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Find creator
    const creator = await db.query.users.findFirst({
      where: sql`lower(${users.username}) = lower(${username})`,
      columns: { id: true, role: true },
    });

    if (!creator || creator.role !== 'creator') {
      return NextResponse.json({ items: [], packs: [], totalCount: 0 });
    }

    // Build conditions for live items
    const conditions = [
      eq(cloudItems.creatorId, creator.id),
      eq(cloudItems.status, 'live'),
    ];
    if (type) conditions.push(eq(cloudItems.type, type));

    // Fetch items and packs in parallel
    const [items, totalResult, packs] = await Promise.all([
      db.select()
        .from(cloudItems)
        .where(and(...conditions))
        .orderBy(desc(cloudItems.publishedAt))
        .limit(limit + 1)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(cloudItems)
        .where(and(...conditions)),
      // Only fetch packs on first page
      offset === 0
        ? db.query.cloudPacks.findMany({
            where: and(eq(cloudPacks.creatorId, creator.id), eq(cloudPacks.status, 'live')),
            orderBy: [desc(cloudPacks.createdAt)],
          })
        : Promise.resolve([]),
    ]);

    const totalCount = Number(totalResult[0]?.count || 0);
    const hasMore = items.length > limit;
    const itemsToReturn = hasMore ? items.slice(0, limit) : items;

    // Check what the current user has purchased
    let purchasedItemIds: string[] = [];
    let purchasedPackIds: string[] = [];
    if (currentUser && (itemsToReturn.length > 0 || packs.length > 0)) {
      const purchases = await db.select()
        .from(cloudPurchases)
        .where(eq(cloudPurchases.buyerId, currentUser.id));

      purchasedItemIds = purchases.filter(p => p.itemId).map(p => p.itemId!);
      purchasedPackIds = purchases.filter(p => p.packId).map(p => p.packId!);
    }

    const isOwner = currentUser?.id === creator.id;

    // Return items with purchase status (hide file URLs for non-purchasers)
    const itemsWithStatus = itemsToReturn.map(item => ({
      id: item.id,
      type: item.type,
      durationSeconds: item.durationSeconds,
      priceCoins: item.priceCoins,
      publishedAt: item.publishedAt,
      hasPurchased: isOwner || purchasedItemIds.includes(item.id),
      // Only show real URL if purchased, otherwise show preview/thumbnail
      thumbnailUrl: item.thumbnailUrl || item.previewUrl || item.fileUrl,
      fileUrl: (isOwner || purchasedItemIds.includes(item.id)) ? item.fileUrl : null,
    }));

    const packsWithStatus = packs.map(pack => ({
      ...pack,
      hasPurchased: isOwner || purchasedPackIds.includes(pack.id),
    }));

    return NextResponse.json({
      items: itemsWithStatus,
      packs: packsWithStatus,
      totalCount,
      hasMore,
    });
  } catch (error: any) {
    console.error('[PROFILE CLOUD]', error?.message);
    return NextResponse.json({ items: [], packs: [], totalCount: 0 });
  }
}
