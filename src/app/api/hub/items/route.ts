import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, hubItems, hubItemTags, hubTags } from '@/lib/data/system';
import { eq, and, desc, count, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - List creator's Hub items with filtering
 * Query params: status, tag, type, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'private' | 'ready' | 'live' | null;
    const type = searchParams.get('type') as 'photo' | 'video' | null;
    const tagName = searchParams.get('tag');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(hubItems.creatorId, user.id)];
    if (status) conditions.push(eq(hubItems.status, status));
    if (type) conditions.push(eq(hubItems.type, type));

    // If filtering by tag, get item IDs first
    if (tagName) {
      const tag = await db.query.hubTags.findFirst({
        where: and(eq(hubTags.creatorId, user.id), eq(hubTags.name, tagName)),
      });

      if (!tag) {
        return NextResponse.json({ items: [], total: 0, page, limit });
      }

      const taggedItems = await db.select({ itemId: hubItemTags.itemId })
        .from(hubItemTags)
        .where(eq(hubItemTags.tagId, tag.id));

      const taggedItemIds = taggedItems.map(t => t.itemId);
      if (taggedItemIds.length === 0) {
        return NextResponse.json({ items: [], total: 0, page, limit });
      }

      conditions.push(inArray(hubItems.id, taggedItemIds));
    }

    const where = and(...conditions);

    // Get items and total count
    const [items, [{ total }]] = await Promise.all([
      db.select()
        .from(hubItems)
        .where(where)
        .orderBy(desc(hubItems.uploadedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() })
        .from(hubItems)
        .where(where),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error: any) {
    console.error('[HUB ITEMS GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
