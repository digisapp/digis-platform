import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, clips, clipViews } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get a single clip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const { clipId } = await params;

    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        vod: {
          columns: {
            id: true,
            title: true,
            priceCoins: true,
          },
        },
      },
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Track view (optional - check if user is authenticated)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Increment view count
    await db.update(clips)
      .set({ viewCount: sql`${clips.viewCount} + 1` })
      .where(eq(clips.id, clipId));

    // Record view if user is authenticated
    if (user) {
      await db.insert(clipViews).values({
        clipId,
        userId: user.id,
      }).onConflictDoNothing();
    }

    return NextResponse.json({ clip });
  } catch (error: any) {
    console.error('Error fetching clip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clip' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a clip (creator only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clipId } = await params;

    // Get the clip and verify ownership
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (clip.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own clips' },
        { status: 403 }
      );
    }

    // Delete the clip
    await db.delete(clips).where(eq(clips.id, clipId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting clip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete clip' },
      { status: 500 }
    );
  }
}
