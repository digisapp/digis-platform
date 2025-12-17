import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, clips, vods, users } from '@/lib/data/system';
import { eq, desc, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - List clips (optionally by creator)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = db.query.clips.findMany({
      where: creatorId ? eq(clips.creatorId, creatorId) : undefined,
      orderBy: [desc(clips.createdAt)],
      limit,
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const clipsList = await query;

    return NextResponse.json({ clips: clipsList });
  } catch (error: any) {
    console.error('Error fetching clips:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clips' },
      { status: 500 }
    );
  }
}

// POST - Create a new clip from a VOD
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vodId, title, description, startTime } = body;

    // Validate input
    if (!vodId || !title) {
      return NextResponse.json(
        { error: 'VOD ID and title are required' },
        { status: 400 }
      );
    }

    // Get the VOD and verify ownership
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return NextResponse.json({ error: 'VOD not found' }, { status: 404 });
    }

    if (vod.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create clips from your own VODs' },
        { status: 403 }
      );
    }

    // Validate start time
    const clipStartTime = startTime || 0;
    if (vod.duration && clipStartTime + 30 > vod.duration) {
      return NextResponse.json(
        { error: 'Clip would exceed VOD duration' },
        { status: 400 }
      );
    }

    // Create the clip
    // Note: In production, you'd trigger a video processing job here
    // to extract the 30-second segment from the VOD
    const [clip] = await db.insert(clips).values({
      creatorId: user.id,
      vodId,
      streamId: vod.streamId,
      title,
      description: description || null,
      thumbnailUrl: vod.thumbnailUrl, // Use VOD thumbnail for now
      videoUrl: null, // Will be set after video processing
      duration: 30,
      startTime: clipStartTime,
      isPublic: true, // Clips are free/public
    }).returning();

    return NextResponse.json({ clip });
  } catch (error: any) {
    console.error('Error creating clip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create clip' },
      { status: 500 }
    );
  }
}
