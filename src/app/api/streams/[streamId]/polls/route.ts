import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamPolls } from '@/lib/data/system';
import { eq, and, desc } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get active poll for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    // Get the active poll for this stream
    const poll = await db.query.streamPolls.findFirst({
      where: and(
        eq(streamPolls.streamId, streamId),
        eq(streamPolls.isActive, true)
      ),
      orderBy: [desc(streamPolls.createdAt)],
    });

    if (!poll) {
      return NextResponse.json({ poll: null });
    }

    // Check if poll has expired
    const now = new Date();
    if (new Date(poll.endsAt) < now) {
      // Mark as inactive
      await db.update(streamPolls)
        .set({ isActive: false })
        .where(eq(streamPolls.id, poll.id));

      return NextResponse.json({ poll: { ...poll, isActive: false } });
    }

    return NextResponse.json({ poll });
  } catch (error: any) {
    console.error('Error getting poll:', error);
    return NextResponse.json(
      { error: 'Failed to get poll' },
      { status: 500 }
    );
  }
}

// POST - Create a new poll
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await params;
    const body = await request.json();
    const { question, options, durationSeconds = 60 } = body;

    // Validate input
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Poll requires a question and at least 2 options' },
        { status: 400 }
      );
    }

    if (options.length > 4) {
      return NextResponse.json(
        { error: 'Poll can have maximum 4 options' },
        { status: 400 }
      );
    }

    // Verify user is the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the stream creator can create polls' }, { status: 403 });
    }

    // Deactivate any existing active polls
    await db.update(streamPolls)
      .set({ isActive: false })
      .where(and(
        eq(streamPolls.streamId, streamId),
        eq(streamPolls.isActive, true)
      ));

    // Calculate end time
    const endsAt = new Date(Date.now() + durationSeconds * 1000);

    // Create the new poll
    const [poll] = await db.insert(streamPolls)
      .values({
        streamId,
        creatorId: user.id,
        question,
        options,
        voteCounts: options.map(() => 0), // Initialize vote counts to 0
        totalVotes: 0,
        durationSeconds,
        endsAt,
        isActive: true,
      })
      .returning();

    // Broadcast poll creation to all viewers
    try {
      await AblyRealtimeService.broadcastPollUpdate(streamId, poll, 'created');
    } catch (broadcastError) {
      console.error('[Poll Create] Broadcast failed (poll still created):', broadcastError);
      // Don't fail the request - poll was created successfully in database
    }

    return NextResponse.json({ poll });
  } catch (error: any) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}
