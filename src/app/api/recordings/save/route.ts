import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, vods, users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_PRICE = 25;
const MAX_DURATION = 1800; // 30 minutes

/**
 * Create a VOD record from a client-side uploaded recording.
 * The video is already in Supabase Storage — this just creates the DB record.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can save recordings' }, { status: 403 });
    }

    const body = await request.json();
    const { title, price, duration, streamId, videoUrl, fileSize } = body;

    // Validate required fields
    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'Title and video URL are required' }, { status: 400 });
    }

    // Validate the video URL belongs to our storage
    if (!videoUrl.includes('/storage/') || !videoUrl.includes('/recordings/')) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    }

    // Validate price
    const validPrice = Math.max(MIN_PRICE, parseInt(price) || MIN_PRICE);

    // Validate duration
    const validDuration = Math.min(parseInt(duration) || 0, MAX_DURATION);

    // Create VOD record
    const [recording] = await db.insert(vods).values({
      creatorId: user.id,
      streamId: streamId || null,
      title,
      description: null,
      thumbnailUrl: videoUrl, // Use video URL as thumbnail for now
      videoUrl,
      duration: validDuration,
      recordingType: 'manual',
      isDraft: false,
      isPublic: false, // PPV only
      priceCoins: validPrice,
      subscribersOnly: false,
    }).returning();

    // Update creator's storage usage
    if (fileSize && fileSize > 0) {
      await db.update(users)
        .set({
          storageUsed: sql`${users.storageUsed} + ${fileSize}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({
      recording: {
        id: recording.id,
        title: recording.title,
        videoUrl: recording.videoUrl,
        duration: recording.duration,
        priceCoins: recording.priceCoins,
      },
    });
  } catch (error: any) {
    console.error('[RECORDING SAVE ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to save recording' },
      { status: 500 }
    );
  }
}
