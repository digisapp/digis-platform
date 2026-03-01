import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections, collectionProgress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/collections/[collectionId]/progress
 * Update progress for a collection item completion
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

    const body = await request.json();
    const { completedItems } = body;

    if (typeof completedItems !== 'number' || completedItems < 0) {
      return NextResponse.json({ error: 'completedItems must be a non-negative number' }, { status: 400 });
    }

    const collection = await db.query.collections.findFirst({
      where: eq(collections.id, collectionId),
      columns: { id: true, itemCount: true },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const capped = Math.min(completedItems, collection.itemCount);
    const isComplete = capped >= collection.itemCount && collection.itemCount > 0;

    // Upsert progress
    const existing = await db.query.collectionProgress.findFirst({
      where: and(
        eq(collectionProgress.collectionId, collectionId),
        eq(collectionProgress.userId, user.id),
      ),
    });

    let progress;
    if (existing) {
      [progress] = await db
        .update(collectionProgress)
        .set({
          completedItems: capped,
          totalItems: collection.itemCount,
          lastAccessedAt: new Date(),
          completedAt: isComplete ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(collectionProgress.id, existing.id))
        .returning();
    } else {
      [progress] = await db
        .insert(collectionProgress)
        .values({
          collectionId,
          userId: user.id,
          completedItems: capped,
          totalItems: collection.itemCount,
          completedAt: isComplete ? new Date() : null,
        })
        .returning();
    }

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error('Error updating collection progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
