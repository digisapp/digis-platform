import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamCountdowns } from '@/lib/data/system';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get active countdown for a stream
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    // Get the active countdown for this stream
    const countdown = await db.query.streamCountdowns.findFirst({
      where: and(
        eq(streamCountdowns.streamId, streamId),
        eq(streamCountdowns.isActive, true)
      ),
      orderBy: [desc(streamCountdowns.createdAt)],
    });

    if (!countdown) {
      return NextResponse.json({ countdown: null });
    }

    // Check if countdown has expired
    const now = new Date();
    if (new Date(countdown.endsAt) < now) {
      // Mark as inactive
      await db.update(streamCountdowns)
        .set({ isActive: false })
        .where(eq(streamCountdowns.id, countdown.id));

      return NextResponse.json({ countdown: { ...countdown, isActive: false } });
    }

    return NextResponse.json({ countdown });
  } catch (error: any) {
    console.error('Error getting countdown:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get countdown' },
      { status: 500 }
    );
  }
}

// POST - Create a new countdown
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
    const { label, durationSeconds } = body;

    // Validate input
    if (!label || !durationSeconds) {
      return NextResponse.json(
        { error: 'Countdown requires a label and duration' },
        { status: 400 }
      );
    }

    if (durationSeconds < 10 || durationSeconds > 3600) {
      return NextResponse.json(
        { error: 'Duration must be between 10 seconds and 1 hour' },
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
      return NextResponse.json({ error: 'Only the stream creator can create countdowns' }, { status: 403 });
    }

    // Deactivate any existing active countdowns
    await db.update(streamCountdowns)
      .set({ isActive: false })
      .where(and(
        eq(streamCountdowns.streamId, streamId),
        eq(streamCountdowns.isActive, true)
      ));

    // Calculate end time
    const endsAt = new Date(Date.now() + durationSeconds * 1000);

    // Create the new countdown
    const [countdown] = await db.insert(streamCountdowns)
      .values({
        streamId,
        creatorId: user.id,
        label,
        endsAt,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ countdown });
  } catch (error: any) {
    console.error('Error creating countdown:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create countdown' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel active countdown
export async function DELETE(
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

    // Verify user is the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the stream creator can cancel countdowns' }, { status: 403 });
    }

    // Deactivate all active countdowns for this stream
    await db.update(streamCountdowns)
      .set({ isActive: false })
      .where(and(
        eq(streamCountdowns.streamId, streamId),
        eq(streamCountdowns.isActive, true)
      ));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error canceling countdown:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel countdown' },
      { status: 500 }
    );
  }
}
