import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { streamFeaturedCreators, streams, users } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get featured creators for a stream
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ streamId: string }> }
) {
  try {
    const params = await props.params;
    const streamId = params.streamId;

    const featured = await db
      .select({
        id: streamFeaturedCreators.id,
        creatorId: streamFeaturedCreators.creatorId,
        displayName: streamFeaturedCreators.displayName,
        username: streamFeaturedCreators.username,
        avatarUrl: streamFeaturedCreators.avatarUrl,
        lineupOrder: streamFeaturedCreators.lineupOrder,
        isSpotlighted: streamFeaturedCreators.isSpotlighted,
        spotlightedAt: streamFeaturedCreators.spotlightedAt,
        tipsReceived: streamFeaturedCreators.tipsReceived,
        giftCount: streamFeaturedCreators.giftCount,
        status: streamFeaturedCreators.status,
      })
      .from(streamFeaturedCreators)
      .where(eq(streamFeaturedCreators.streamId, streamId))
      .orderBy(asc(streamFeaturedCreators.lineupOrder));

    return NextResponse.json({ featuredCreators: featured });
  } catch (error: any) {
    console.error('[FEATURED CREATORS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch featured creators' }, { status: 500 });
  }
}

/**
 * Add a featured creator to a stream
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const streamId = params.streamId;

    // Verify user owns this stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - only stream owner can add featured creators' }, { status: 403 });
    }

    const { creatorId, lineupOrder } = await request.json();

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    // Can't feature yourself (you're already the host)
    if (creatorId === user.id) {
      return NextResponse.json({ error: 'Cannot feature yourself - you are the host' }, { status: 400 });
    }

    // Check if creator exists and is a creator
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (creator.role !== 'creator') {
      return NextResponse.json({ error: 'User is not a creator' }, { status: 400 });
    }

    // Check if already featured
    const existing = await db.query.streamFeaturedCreators.findFirst({
      where: and(
        eq(streamFeaturedCreators.streamId, streamId),
        eq(streamFeaturedCreators.creatorId, creatorId)
      ),
    });

    if (existing) {
      return NextResponse.json({ error: 'Creator is already featured' }, { status: 400 });
    }

    // Get current max lineup order
    const maxOrder = await db
      .select({ maxOrder: streamFeaturedCreators.lineupOrder })
      .from(streamFeaturedCreators)
      .where(eq(streamFeaturedCreators.streamId, streamId))
      .orderBy(asc(streamFeaturedCreators.lineupOrder))
      .limit(1);

    const newOrder = lineupOrder ?? (maxOrder[0]?.maxOrder ?? 0) + 1;

    // Create featured creator entry
    const [featured] = await db.insert(streamFeaturedCreators).values({
      streamId,
      creatorId,
      displayName: creator.displayName,
      username: creator.username || `user_${creatorId.slice(0, 8)}`, // Fallback for username
      avatarUrl: creator.avatarUrl,
      lineupOrder: newOrder,
      status: 'accepted', // Auto-accept for now, could be 'pending' for invite flow
    }).returning();

    // Broadcast update to stream viewers
    try {
      await AblyRealtimeService.broadcastToStream(streamId, 'featured-creator-added', {
        creator: {
          id: featured.id,
          creatorId: featured.creatorId,
          displayName: featured.displayName,
          username: featured.username,
          avatarUrl: featured.avatarUrl,
          lineupOrder: featured.lineupOrder,
        },
      });
    } catch (broadcastError) {
      console.error('[FEATURED CREATOR BROADCAST ERROR]', broadcastError);
    }

    return NextResponse.json({ featuredCreator: featured }, { status: 201 });
  } catch (error: any) {
    console.error('[FEATURED CREATOR ADD ERROR]', error);
    return NextResponse.json({ error: 'Failed to add featured creator' }, { status: 500 });
  }
}
