import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams, shows, showTickets } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Start VIP mode on a stream
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const { showId } = await req.json();

    if (!showId) {
      return NextResponse.json({ error: 'Show ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the stream exists and user is the creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (stream.status !== 'live') {
      return NextResponse.json({ error: 'Stream is not live' }, { status: 400 });
    }

    // Verify the show exists and belongs to this creator
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (show.creatorId !== user.id) {
      return NextResponse.json({ error: 'Show does not belong to you' }, { status: 403 });
    }

    // Activate VIP mode on the stream
    await db
      .update(streams)
      .set({
        activeVipShowId: showId,
        vipStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    // Update show status to live
    await db
      .update(shows)
      .set({
        status: 'live',
        actualStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shows.id, showId));

    // Broadcast VIP mode activation to all viewers
    await AblyRealtimeService.broadcastVipModeChange(streamId, {
      isActive: true,
      showId,
      showTitle: show.title,
      ticketPrice: show.ticketPrice,
    });

    return NextResponse.json({
      success: true,
      message: 'VIP mode activated',
      vipShowId: showId,
    });
  } catch (error) {
    console.error('[VIP] Error activating VIP mode:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate VIP mode' },
      { status: 500 }
    );
  }
}

// End VIP mode on a stream
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the stream exists and user is the creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const vipShowId = stream.activeVipShowId;

    // End VIP mode
    await db
      .update(streams)
      .set({
        activeVipShowId: null,
        vipStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    // Update show status to ended if there was one
    if (vipShowId) {
      await db
        .update(shows)
        .set({
          status: 'ended',
          actualEnd: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shows.id, vipShowId));
    }

    // Broadcast VIP mode ended to all viewers
    await AblyRealtimeService.broadcastVipModeChange(streamId, {
      isActive: false,
      showId: null,
      showTitle: null,
      ticketPrice: null,
    });

    return NextResponse.json({
      success: true,
      message: 'VIP mode ended',
    });
  } catch (error) {
    console.error('[VIP] Error ending VIP mode:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end VIP mode' },
      { status: 500 }
    );
  }
}

// Check VIP access for current user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get stream with VIP info
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // If no VIP mode active, everyone has access
    if (!stream.activeVipShowId) {
      return NextResponse.json({
        vipActive: false,
        hasAccess: true,
      });
    }

    // Get show details
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, stream.activeVipShowId),
    });

    // Check if user has a ticket (or is the creator)
    let hasTicket = false;
    if (user) {
      // Creator always has access
      if (stream.creatorId === user.id) {
        hasTicket = true;
      } else {
        // Check for ticket
        const ticket = await db.query.showTickets.findFirst({
          where: and(
            eq(showTickets.showId, stream.activeVipShowId),
            eq(showTickets.userId, user.id),
            eq(showTickets.isValid, true)
          ),
        });
        hasTicket = !!ticket;
      }
    }

    return NextResponse.json({
      vipActive: true,
      hasAccess: hasTicket,
      showId: stream.activeVipShowId,
      showTitle: show?.title || 'VIP Stream',
      ticketPrice: show?.ticketPrice || 0,
      vipStartedAt: stream.vipStartedAt,
    });
  } catch (error) {
    console.error('[VIP] Error checking VIP access:', error);
    return NextResponse.json(
      { error: 'Failed to check VIP access' },
      { status: 500 }
    );
  }
}
