import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, vods } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Save a completed stream as a VOD (Video on Demand)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { streamId } = await params;
    const body = await req.json();
    const { title, description, priceCoins, isPublic, subscribersOnly } = body;

    // Validate inputs
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (priceCoins !== undefined && (priceCoins < 0 || !Number.isInteger(priceCoins))) {
      return NextResponse.json(
        { error: 'Price must be a non-negative integer' },
        { status: 400 }
      );
    }

    // Get stream details
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Verify user is the creator
    if (stream.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the stream creator can save this stream' },
        { status: 403 }
      );
    }

    // Check if VOD already exists for this stream
    const existingVOD = await db.query.vods.findFirst({
      where: eq(vods.streamId, streamId),
    });

    if (existingVOD) {
      return NextResponse.json(
        { error: 'This stream has already been saved as a VOD' },
        { status: 400 }
      );
    }

    // Calculate duration
    const duration = stream.durationSeconds || 0;

    // Create VOD record
    const [vod] = await db
      .insert(vods)
      .values({
        streamId,
        creatorId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        thumbnailUrl: stream.thumbnailUrl || null,
        videoUrl: null, // Will be set later when video is processed/uploaded
        duration,
        isPublic: isPublic || false,
        priceCoins: priceCoins || 0,
        subscribersOnly: subscribersOnly || false,
        originalViewers: stream.totalViews,
        originalPeakViewers: stream.peakViewers,
        originalEarnings: stream.totalGiftsReceived,
      })
      .returning();

    console.log(`[Save Stream] Created VOD ${vod.id} from stream ${streamId}`);

    return NextResponse.json({
      success: true,
      vodId: vod.id,
      message: 'Stream saved successfully',
    });
  } catch (error: any) {
    console.error('[Save Stream] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save stream' },
      { status: 500 }
    );
  }
}
