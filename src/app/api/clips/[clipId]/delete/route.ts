import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { clips, clipViews, clipLikes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * DELETE /api/clips/[clipId]/delete
 * Delete a clip (creator only, must own it)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const { clipId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
      columns: { id: true, creatorId: true },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (clip.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Cascade delete views and likes, then the clip
    await db.delete(clipViews).where(eq(clipViews.clipId, clipId));
    await db.delete(clipLikes).where(eq(clipLikes.clipId, clipId));
    await db.delete(clips).where(eq(clips.id, clipId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Delete Clip] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to delete clip' },
      { status: 500 }
    );
  }
}
