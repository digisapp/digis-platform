import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamPolls } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - End a poll early
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; pollId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId, pollId } = await params;

    // Verify user is the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the stream creator can end polls' }, { status: 403 });
    }

    // End the poll
    const [updatedPoll] = await db.update(streamPolls)
      .set({ isActive: false })
      .where(eq(streamPolls.id, pollId))
      .returning();

    if (!updatedPoll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Broadcast poll ended to all viewers
    try {
      await AblyRealtimeService.broadcastPollUpdate(streamId, updatedPoll, 'ended');
    } catch (broadcastError) {
      console.error('[Poll End] Broadcast failed (poll still ended):', broadcastError);
      // Don't fail the request - poll was ended successfully in database
    }

    return NextResponse.json({ poll: updatedPoll });
  } catch (error: any) {
    console.error('Error ending poll:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end poll' },
      { status: 500 }
    );
  }
}
