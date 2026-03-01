import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections, collectionPurchases } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/collections/feed?creatorId=xxx
 * Browse published collections for a creator
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }

    const result = await db.query.collections.findMany({
      where: and(
        eq(collections.creatorId, creatorId),
        eq(collections.isPublished, true),
      ),
      orderBy: [desc(collections.createdAt)],
      with: {
        items: {
          orderBy: (items, { asc }) => [asc(items.position)],
          with: {
            content: {
              columns: { id: true, title: true, thumbnailUrl: true, contentType: true },
            },
            vod: {
              columns: { id: true, title: true, thumbnailUrl: true, duration: true },
            },
          },
        },
      },
    });

    // If user is logged in, check which collections they've purchased
    let purchasedIds: Set<string> = new Set();
    if (user) {
      const purchases = await db.query.collectionPurchases.findMany({
        where: eq(collectionPurchases.userId, user.id),
        columns: { collectionId: true },
      });
      purchasedIds = new Set(purchases.map(p => p.collectionId));
    }

    const collectionsWithAccess = result.map(c => ({
      ...c,
      hasAccess: user?.id === creatorId || purchasedIds.has(c.id) || c.priceCoins === 0,
    }));

    return NextResponse.json({ collections: collectionsWithAccess });
  } catch (error: any) {
    console.error('Error fetching collections feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}
