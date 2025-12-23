import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { creatorLinks, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PUT /api/creator/links/reorder - Reorder links
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const [profile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile || profile.role !== 'creator') {
      return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
    }

    const body = await request.json();
    const { linkIds } = body; // Array of link IDs in the new order

    if (!Array.isArray(linkIds)) {
      return NextResponse.json({ error: 'linkIds must be an array' }, { status: 400 });
    }

    // Update each link's display order
    await Promise.all(
      linkIds.map((linkId: string, index: number) =>
        db
          .update(creatorLinks)
          .set({
            displayOrder: index,
            updatedAt: new Date(),
          })
          .where(eq(creatorLinks.id, linkId))
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Creator Links Reorder] Error:', error);
    return NextResponse.json({ error: 'Failed to reorder links' }, { status: 500 });
  }
}
