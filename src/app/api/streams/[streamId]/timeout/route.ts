import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory timeout storage (resets on server restart)
// In production, this should be stored in Redis or database
const timeouts = new Map<string, Map<string, number>>(); // streamId -> userId -> expiryTime

// POST /api/streams/[streamId]/timeout - Timeout a user (creator only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const { userId, duration } = await request.json(); // duration in minutes

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the stream creator can timeout users' }, { status: 403 });
    }

    // Don't allow timing out yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot timeout yourself' }, { status: 400 });
    }

    // Calculate expiry time
    const expiryTime = Date.now() + (duration * 60 * 1000);

    // Store timeout
    if (!timeouts.has(streamId)) {
      timeouts.set(streamId, new Map());
    }
    timeouts.get(streamId)!.set(userId, expiryTime);

    // Clean up expired timeouts
    setTimeout(() => {
      const streamTimeouts = timeouts.get(streamId);
      if (streamTimeouts) {
        streamTimeouts.delete(userId);
        if (streamTimeouts.size === 0) {
          timeouts.delete(streamId);
        }
      }
    }, duration * 60 * 1000);

    console.log(`[TIMEOUT] User ${userId} timed out in stream ${streamId} for ${duration} minutes`);

    return NextResponse.json({
      success: true,
      expiresAt: new Date(expiryTime).toISOString(),
    });
  } catch (error: any) {
    console.error('Error timing out user:', error);
    return NextResponse.json(
      { error: 'Failed to timeout user' },
      { status: 500 }
    );
  }
}

// GET /api/streams/[streamId]/timeout?userId=xxx - Check if user is timed out
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const streamTimeouts = timeouts.get(streamId);
    if (!streamTimeouts) {
      return NextResponse.json({ isTimedOut: false });
    }

    const expiryTime = streamTimeouts.get(userId);
    if (!expiryTime || expiryTime < Date.now()) {
      // Timeout expired or doesn't exist
      if (expiryTime) {
        streamTimeouts.delete(userId);
        if (streamTimeouts.size === 0) {
          timeouts.delete(streamId);
        }
      }
      return NextResponse.json({ isTimedOut: false });
    }

    return NextResponse.json({
      isTimedOut: true,
      expiresAt: new Date(expiryTime).toISOString(),
    });
  } catch (error: any) {
    console.error('Error checking timeout:', error);
    return NextResponse.json(
      { error: 'Failed to check timeout' },
      { status: 500 }
    );
  }
}
