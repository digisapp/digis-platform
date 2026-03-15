import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, cloudPacks, cloudPackItems, cloudItems } from '@/lib/data/system';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - List creator's packs
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const packs = await db.query.cloudPacks.findMany({
      where: eq(cloudPacks.creatorId, user.id),
      orderBy: [desc(cloudPacks.createdAt)],
      with: {
        items: {
          with: {
            item: true,
          },
          orderBy: (cloudPackItems, { asc }) => [asc(cloudPackItems.sortOrder)],
        },
      },
    });

    return NextResponse.json({ packs });
  } catch (error: any) {
    console.error('[CLOUD PACKS GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * POST - Create a new pack
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can create packs' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priceCoins, itemIds } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (typeof priceCoins !== 'number' || priceCoins < 0 || !Number.isInteger(priceCoins)) {
      return NextResponse.json({ error: 'priceCoins must be a positive integer' }, { status: 400 });
    }

    // Validate item IDs if provided
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      const items = await db.select()
        .from(cloudItems)
        .where(and(
          eq(cloudItems.creatorId, user.id),
        ));

      const ownedIds = new Set(items.map(i => i.id));
      const invalid = itemIds.filter((id: string) => !ownedIds.has(id));
      if (invalid.length > 0) {
        return NextResponse.json({ error: 'Some items not found or not owned by you' }, { status: 400 });
      }
    }

    // Create the pack
    const [pack] = await db.insert(cloudPacks).values({
      creatorId: user.id,
      title: title.trim(),
      description: description || null,
      priceCoins,
      itemCount: itemIds?.length || 0,
    }).returning();

    // Add items to pack
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      await db.insert(cloudPackItems).values(
        itemIds.map((itemId: string, index: number) => ({
          packId: pack.id,
          itemId,
          sortOrder: index,
        }))
      );
    }

    return NextResponse.json({ pack }, { status: 201 });
  } catch (error: any) {
    console.error('[CLOUD PACKS POST]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
