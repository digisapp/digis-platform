import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/collections
 * Create a new collection (creator only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, thumbnailUrl, priceCoins, subscribersOnly } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (priceCoins !== undefined && (typeof priceCoins !== 'number' || priceCoins < 0)) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
    }

    // Get current max display order
    const existing = await db.query.collections.findMany({
      where: eq(collections.creatorId, user.id),
      columns: { displayOrder: true },
    });
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.displayOrder), -1);

    const [collection] = await db
      .insert(collections)
      .values({
        creatorId: user.id,
        title: title.trim(),
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
        priceCoins: priceCoins || 0,
        subscribersOnly: subscribersOnly || false,
        displayOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json({ collection });
  } catch (error: any) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
