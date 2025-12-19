import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, shows } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { publishToChannel } from '@/lib/ably/server';

export const runtime = 'nodejs';

// POST /api/streams/[streamId]/announce-ticketed
// Announce a ticketed stream from an active live broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, ticketPrice, minutesUntilStart } = body;

    // Validate inputs
    if (!ticketPrice || ticketPrice < 10) {
      return NextResponse.json(
        { error: 'Minimum ticket price is 10 coins' },
        { status: 400 }
      );
    }

    if (!minutesUntilStart || minutesUntilStart < 15 || minutesUntilStart > 60) {
      return NextResponse.json(
        { error: 'Stream must start between 15-60 minutes from now' },
        { status: 400 }
      );
    }

    // Verify the stream exists and belongs to the user
    const stream = await db.query.streams.findFirst({
      where: and(
        eq(streams.id, streamId),
        eq(streams.creatorId, user.id)
      ),
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found or not authorized' },
        { status: 404 }
      );
    }

    if (stream.status !== 'live') {
      return NextResponse.json(
        { error: 'You can only announce ticketed streams from an active live broadcast' },
        { status: 400 }
      );
    }

    // Check if there's already a pending ticketed stream from this broadcast
    const existingShow = await db.query.shows.findFirst({
      where: and(
        eq(shows.creatorId, user.id),
        eq(shows.status, 'scheduled')
      ),
    });

    if (existingShow) {
      return NextResponse.json(
        { error: 'You already have a ticketed stream scheduled. End or cancel it first.' },
        { status: 400 }
      );
    }

    // Calculate scheduled start time
    const scheduledStart = new Date(Date.now() + minutesUntilStart * 60 * 1000);

    // Create the ticketed stream (show)
    const [ticketedStream] = await db.insert(shows).values({
      creatorId: user.id,
      title: title?.trim() || `${stream.title} - Ticketed Stream`,
      description: `Exclusive ticketed stream from ${stream.title}`,
      showType: 'hangout',
      ticketPrice,
      maxTickets: null, // No limit
      scheduledStart,
      durationMinutes: 60, // Default 1 hour
      status: 'scheduled',
      // Link to parent stream for reference
      streamId: streamId,
    }).returning();

    // Publish announcement to the stream chat channel via Ably
    // Note: Client subscribes to `stream:${streamId}:chat` for ticketed-announcement events
    try {
      await publishToChannel(`stream:${streamId}:chat`, 'ticketed-announcement', {
        ticketedStreamId: ticketedStream.id,
        title: ticketedStream.title,
        ticketPrice,
        startsAt: scheduledStart.toISOString(),
        minutesUntilStart,
        creatorUsername: stream.creatorId, // Will be resolved client-side
      });

      // Also send a system message to the chat
      await publishToChannel(`stream:${streamId}:chat`, 'chat', {
        id: `system-${Date.now()}`,
        message: `🎟️ VIP STREAM ANNOUNCED! "${ticketedStream.title}" starts in ${minutesUntilStart} minutes. Tickets: ${ticketPrice} coins. Tap to get your ticket!`,
        userId: 'system',
        username: 'System',
        messageType: 'system',
        createdAt: new Date().toISOString(),
        ticketedStreamId: ticketedStream.id,
      });
    } catch (ablyError) {
      console.error('[Announce Ticketed] Failed to publish to Ably:', ablyError);
      // Don't fail the request, the ticketed stream is created
    }

    return NextResponse.json({
      success: true,
      ticketedStream: {
        id: ticketedStream.id,
        title: ticketedStream.title,
        ticketPrice: ticketedStream.ticketPrice,
        scheduledStart: ticketedStream.scheduledStart,
        minutesUntilStart,
      },
    });
  } catch (error: any) {
    console.error('[Announce Ticketed] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to announce ticketed stream' },
      { status: 500 }
    );
  }
}
