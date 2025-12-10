import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { streamFeaturedCreators, streams, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { StreamService } from '@/lib/streams/stream-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Send a tip to a featured creator
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ streamId: string; creatorId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { streamId, creatorId } = params;

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 });
    }

    // Verify stream exists
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Verify featured creator exists
    const featuredCreator = await db.query.streamFeaturedCreators.findFirst({
      where: and(
        eq(streamFeaturedCreators.streamId, streamId),
        eq(streamFeaturedCreators.creatorId, creatorId)
      ),
    });

    if (!featuredCreator) {
      return NextResponse.json({ error: 'Featured creator not found' }, { status: 404 });
    }

    // Get sender's details
    const sender = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get receiver details
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Use StreamService.sendTip which handles balance check and transactions
    const senderUsername = sender.username || sender.displayName || 'Anonymous';
    const receiverUsername = receiver.username || 'Unknown';

    const result = await StreamService.sendTip(
      streamId,
      user.id,
      senderUsername,
      amount,
      creatorId,
      receiverUsername
    );

    // Update featured creator's tip count
    await db
      .update(streamFeaturedCreators)
      .set({
        tipsReceived: sql`${streamFeaturedCreators.tipsReceived} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(streamFeaturedCreators.id, featuredCreator.id));

    // Broadcast tip to stream
    try {
      await AblyRealtimeService.broadcastToStream(streamId, 'featured-creator-tip', {
        senderUsername: senderUsername,
        senderAvatarUrl: sender.avatarUrl,
        receiverUsername: receiverUsername,
        amount,
      });
    } catch (broadcastError) {
      console.error('[FEATURED TIP BROADCAST ERROR]', broadcastError);
    }

    return NextResponse.json({
      success: true,
      amount,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error('[FEATURED CREATOR TIP ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to send tip' }, { status: 500 });
  }
}

/**
 * Update a featured creator (spotlight, order, etc.)
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ streamId: string; creatorId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { streamId, creatorId } = params;

    // Verify user owns this stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { isSpotlighted, lineupOrder } = body;

    // Find the featured creator entry
    const existing = await db.query.streamFeaturedCreators.findFirst({
      where: and(
        eq(streamFeaturedCreators.streamId, streamId),
        eq(streamFeaturedCreators.creatorId, creatorId)
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Featured creator not found' }, { status: 404 });
    }

    // Build update object
    const updates: any = { updatedAt: new Date() };

    if (typeof isSpotlighted === 'boolean') {
      // If spotlighting this creator, un-spotlight all others first
      if (isSpotlighted) {
        await db
          .update(streamFeaturedCreators)
          .set({ isSpotlighted: false, spotlightedAt: null })
          .where(eq(streamFeaturedCreators.streamId, streamId));
      }

      updates.isSpotlighted = isSpotlighted;
      updates.spotlightedAt = isSpotlighted ? new Date() : null;
    }

    if (typeof lineupOrder === 'number') {
      updates.lineupOrder = lineupOrder;
    }

    // Update the featured creator
    const [updated] = await db
      .update(streamFeaturedCreators)
      .set(updates)
      .where(eq(streamFeaturedCreators.id, existing.id))
      .returning();

    // Broadcast spotlight change to all viewers
    if (typeof isSpotlighted === 'boolean') {
      try {
        await AblyRealtimeService.broadcastToStream(streamId, 'spotlight-changed', {
          spotlightedCreator: isSpotlighted ? {
            id: updated.id,
            creatorId: updated.creatorId,
            displayName: updated.displayName,
            username: updated.username,
            avatarUrl: updated.avatarUrl,
            tipsReceived: updated.tipsReceived,
          } : null,
        });
      } catch (broadcastError) {
        console.error('[SPOTLIGHT BROADCAST ERROR]', broadcastError);
      }
    }

    return NextResponse.json({ featuredCreator: updated });
  } catch (error: any) {
    console.error('[FEATURED CREATOR UPDATE ERROR]', error);
    return NextResponse.json({ error: 'Failed to update featured creator' }, { status: 500 });
  }
}

/**
 * Remove a featured creator from a stream
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ streamId: string; creatorId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { streamId, creatorId } = params;

    // Verify user owns this stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the featured creator entry
    const deleted = await db
      .delete(streamFeaturedCreators)
      .where(
        and(
          eq(streamFeaturedCreators.streamId, streamId),
          eq(streamFeaturedCreators.creatorId, creatorId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Featured creator not found' }, { status: 404 });
    }

    // Broadcast removal to viewers
    try {
      await AblyRealtimeService.broadcastToStream(streamId, 'featured-creator-removed', {
        creatorId,
      });
    } catch (broadcastError) {
      console.error('[FEATURED CREATOR REMOVE BROADCAST ERROR]', broadcastError);
    }

    return NextResponse.json({ message: 'Featured creator removed' });
  } catch (error: any) {
    console.error('[FEATURED CREATOR DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to remove featured creator' }, { status: 500 });
  }
}
