import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, hubTags, hubItemTags, hubItems } from '@/lib/data/system';
import { eq, and, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - List creator's tags
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await db.query.hubTags.findMany({
      where: eq(hubTags.creatorId, user.id),
      with: {
        itemTags: true,
      },
    });

    // Return tags with item count
    const result = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      itemCount: tag.itemTags.length,
      createdAt: tag.createdAt,
    }));

    return NextResponse.json({ tags: result });
  } catch (error: any) {
    console.error('[HUB TAGS GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * POST - Create a tag and optionally apply to items
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, itemIds } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Tag name too long (max 50 chars)' }, { status: 400 });
    }

    // Check if tag already exists
    const existing = await db.query.hubTags.findFirst({
      where: and(eq(hubTags.creatorId, user.id), eq(hubTags.name, name.trim())),
    });

    let tag = existing;

    if (!tag) {
      const [created] = await db.insert(hubTags).values({
        creatorId: user.id,
        name: name.trim(),
      }).returning();
      tag = created;
    }

    // Apply to items if provided
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      // Verify items belong to creator
      const items = await db.select()
        .from(hubItems)
        .where(and(
          eq(hubItems.creatorId, user.id),
          inArray(hubItems.id, itemIds),
        ));

      const validIds = items.map(i => i.id);

      // Get existing tag associations
      const existingAssocs = await db.select()
        .from(hubItemTags)
        .where(eq(hubItemTags.tagId, tag.id));

      const alreadyTagged = new Set(existingAssocs.map(a => a.itemId));
      const newIds = validIds.filter(id => !alreadyTagged.has(id));

      if (newIds.length > 0) {
        await db.insert(hubItemTags).values(
          newIds.map(itemId => ({
            itemId,
            tagId: tag!.id,
          }))
        );
      }
    }

    return NextResponse.json({ tag }, { status: existing ? 200 : 201 });
  } catch (error: any) {
    console.error('[HUB TAGS POST]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * DELETE - Delete a tag (removes from all items)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');

    if (!tagId) {
      return NextResponse.json({ error: 'Tag id is required' }, { status: 400 });
    }

    const tag = await db.query.hubTags.findFirst({
      where: and(eq(hubTags.id, tagId), eq(hubTags.creatorId, user.id)),
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await db.delete(hubTags).where(eq(hubTags.id, tagId));

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('[HUB TAGS DELETE]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
