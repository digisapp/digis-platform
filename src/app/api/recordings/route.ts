import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, vods, users } from '@/lib/data/system';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - List creator's recordings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeDrafts = searchParams.get('includeDrafts') === 'true';
    const draftsOnly = searchParams.get('draftsOnly') === 'true';

    let whereClause;
    if (draftsOnly) {
      whereClause = and(
        eq(vods.creatorId, user.id),
        eq(vods.isDraft, true),
        eq(vods.recordingType, 'manual')
      );
    } else if (includeDrafts) {
      whereClause = and(
        eq(vods.creatorId, user.id),
        eq(vods.recordingType, 'manual')
      );
    } else {
      whereClause = and(
        eq(vods.creatorId, user.id),
        eq(vods.isDraft, false),
        eq(vods.recordingType, 'manual')
      );
    }

    const recordings = await db.query.vods.findMany({
      where: whereClause,
      orderBy: [desc(vods.createdAt)],
      columns: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        videoUrl: true,
        duration: true,
        priceCoins: true,
        isDraft: true,
        viewCount: true,
        purchaseCount: true,
        totalEarnings: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ recordings });
  } catch (error: any) {
    console.error('[RECORDINGS LIST ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}
