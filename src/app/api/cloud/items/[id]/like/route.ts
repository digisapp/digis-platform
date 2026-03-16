import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { cloudItems, cloudLikes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/cloud/items/[id]/like — Toggle like
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: itemId } = await props.params;

    // Check if item exists
    const item = await db.query.cloudItems.findFirst({
      where: eq(cloudItems.id, itemId),
      columns: { id: true, likeCount: true },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check existing like
    const existingLike = await db.query.cloudLikes.findFirst({
      where: and(
        eq(cloudLikes.itemId, itemId),
        eq(cloudLikes.userId, user.id)
      ),
    });

    if (existingLike) {
      // Unlike
      await db.delete(cloudLikes).where(
        and(
          eq(cloudLikes.itemId, itemId),
          eq(cloudLikes.userId, user.id)
        )
      );

      await db.update(cloudItems)
        .set({ likeCount: sql`GREATEST(${cloudItems.likeCount} - 1, 0)` })
        .where(eq(cloudItems.id, itemId));

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: Math.max((item.likeCount || 0) - 1, 0),
      });
    } else {
      // Like
      await db.insert(cloudLikes).values({
        itemId,
        userId: user.id,
      });

      await db.update(cloudItems)
        .set({ likeCount: sql`${cloudItems.likeCount} + 1` })
        .where(eq(cloudItems.id, itemId));

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: (item.likeCount || 0) + 1,
      });
    }
  } catch (error: any) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
