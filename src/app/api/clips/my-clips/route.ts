import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { clips } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/clips/my-clips
 * Get authenticated creator's clips with totals
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorClips = await db.query.clips.findMany({
      where: eq(clips.creatorId, user.id),
      orderBy: [desc(clips.createdAt)],
    });

    const totals = creatorClips.reduce(
      (acc, clip) => ({
        totalViews: acc.totalViews + clip.viewCount,
        totalLikes: acc.totalLikes + clip.likeCount,
        totalShares: acc.totalShares + clip.shareCount,
      }),
      { totalViews: 0, totalLikes: 0, totalShares: 0 }
    );

    return NextResponse.json({
      clips: creatorClips,
      totals,
      count: creatorClips.length,
    });
  } catch (error: any) {
    console.error('[My Clips] Error:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch clips' },
      { status: 500 }
    );
  }
}
