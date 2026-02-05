import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, vods } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { LiveKitEgressService } from '@/lib/services/livekit-egress-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Minimum price for VOD saves (prevents free content flooding storage)
const MIN_VOD_PRICE = 250;

/**
 * Save a completed stream as a VOD (Video on Demand)
 * All VODs must be paid - minimum 250 coins
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

    // Enforce minimum price - all VODs must be paid
    const price = priceCoins !== undefined ? priceCoins : MIN_VOD_PRICE;
    if (price < MIN_VOD_PRICE) {
      return NextResponse.json(
        { error: `Minimum price is ${MIN_VOD_PRICE} coins. Free VODs are not allowed.` },
        { status: 400 }
      );
    }
    if (!Number.isInteger(price)) {
      return NextResponse.json(
        { error: 'Price must be a whole number' },
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

    // Get video URL from egress if recording was made
    let videoUrl: string | null = null;
    if (stream.egressId) {
      try {
        // Check egress status and get file location
        const egressInfo = await LiveKitEgressService.getEgressInfo(stream.egressId);
        if (egressInfo?.fileResults && egressInfo.fileResults.length > 0) {
          const fileResult = egressInfo.fileResults[0];
          // Use the location (full path) to construct the public URL
          if (fileResult.location) {
            videoUrl = LiveKitEgressService.getPublicUrl(fileResult.location);
            console.log(`[Save Stream] Got video URL from egress: ${videoUrl}`);
          }
        }
      } catch (err) {
        console.warn('[Save Stream] Could not get video URL from egress:', err);
        // Continue without video URL - can be added later
      }
    }

    // Create VOD record
    const [vod] = await db
      .insert(vods)
      .values({
        streamId,
        creatorId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        thumbnailUrl: stream.thumbnailUrl || null,
        videoUrl, // Set from egress recording or null
        duration,
        isPublic: isPublic || false,
        priceCoins: price,
        subscribersOnly: subscribersOnly || false,
        originalViewers: stream.totalViews,
        originalPeakViewers: stream.peakViewers,
        originalEarnings: stream.totalGiftsReceived,
      })
      .returning();

    console.log(`[Save Stream] Created VOD ${vod.id} from stream ${streamId}${videoUrl ? ' with video' : ' (no video)'}`);

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
