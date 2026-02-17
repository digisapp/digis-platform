import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { collections } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/collections/creator
 * Get all collections for the authenticated creator
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query.collections.findMany({
      where: eq(collections.creatorId, user.id),
      orderBy: [asc(collections.displayOrder)],
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

    return NextResponse.json({ collections: result });
  } catch (error: any) {
    console.error('Error fetching creator collections:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}
