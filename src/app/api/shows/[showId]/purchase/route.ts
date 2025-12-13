import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { showId } = await params;

    // Get streamId from request body (optional - for broadcasting to chat)
    let streamId: string | null = null;
    try {
      const body = await request.json();
      streamId = body.streamId || null;
    } catch {
      // No body or invalid JSON - that's okay, streamId is optional
    }

    const result = await ShowService.purchaseTicket({
      userId: user.id,
      showId,
    });

    // Broadcast ticket purchase to chat if streamId is provided
    if (streamId) {
      // Get user info for the chat message
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: {
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      if (userInfo && userInfo.username) {
        // Broadcast to chat in background (don't block response)
        AblyRealtimeService.broadcastTicketPurchase(streamId, {
          userId: user.id,
          username: userInfo.username,
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl,
          showTitle: result.show.title,
          ticketPrice: result.show.ticketPrice,
        }).catch(err => {
          console.error('[TicketPurchase] Failed to broadcast to chat:', err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      ticket: result.ticket,
      show: result.show,
      message: 'Ticket purchased successfully!',
    });
  } catch (error) {
    console.error('Error purchasing ticket:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to purchase ticket' },
      { status: 500 }
    );
  }
}
