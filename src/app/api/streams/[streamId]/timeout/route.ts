import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Redis key format: stream_timeout:{streamId}:{userId}
// Value: expiry timestamp (ISO string)
// TTL: Auto-expires with the timeout duration

const TIMEOUT_KEY_PREFIX = 'stream_timeout';
const MAX_TIMEOUT_MINUTES = 1440; // Maximum 24 hours
const MIN_TIMEOUT_MINUTES = 1;

function getTimeoutKey(streamId: string, userId: string): string {
  return `${TIMEOUT_KEY_PREFIX}:${streamId}:${userId}`;
}

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

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Valid userId required' }, { status: 400 });
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < MIN_TIMEOUT_MINUTES || durationNum > MAX_TIMEOUT_MINUTES) {
      return NextResponse.json({
        error: `Duration must be between ${MIN_TIMEOUT_MINUTES} and ${MAX_TIMEOUT_MINUTES} minutes`
      }, { status: 400 });
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
    const expiryTime = Date.now() + (durationNum * 60 * 1000);
    const expiryDate = new Date(expiryTime);

    // Store timeout in Redis with automatic expiry (TTL)
    const key = getTimeoutKey(streamId, userId);
    const ttlSeconds = durationNum * 60;

    await redis.set(key, expiryDate.toISOString(), { ex: ttlSeconds });

    console.log(`[TIMEOUT] User ${userId} timed out in stream ${streamId} for ${durationNum} minutes`);

    return NextResponse.json({
      success: true,
      expiresAt: expiryDate.toISOString(),
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

    // Check Redis for timeout
    const key = getTimeoutKey(streamId, userId);
    const expiryString = await redis.get(key);

    if (!expiryString) {
      // No timeout or already expired (Redis auto-deletes expired keys)
      return NextResponse.json({ isTimedOut: false });
    }

    const expiryTime = new Date(expiryString as string).getTime();

    // Double-check expiry (in case of clock skew)
    if (expiryTime < Date.now()) {
      // Cleanup stale key (shouldn't happen often due to TTL)
      await redis.del(key);
      return NextResponse.json({ isTimedOut: false });
    }

    return NextResponse.json({
      isTimedOut: true,
      expiresAt: expiryString,
    });
  } catch (error: any) {
    console.error('Error checking timeout:', error);
    return NextResponse.json(
      { error: 'Failed to check timeout' },
      { status: 500 }
    );
  }
}

// DELETE /api/streams/[streamId]/timeout - Remove a timeout (creator only)
export async function DELETE(
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
      return NextResponse.json({ error: 'Only the stream creator can remove timeouts' }, { status: 403 });
    }

    // Remove timeout from Redis
    const key = getTimeoutKey(streamId, userId);
    await redis.del(key);

    console.log(`[TIMEOUT] Removed timeout for user ${userId} in stream ${streamId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing timeout:', error);
    return NextResponse.json(
      { error: 'Failed to remove timeout' },
      { status: 500 }
    );
  }
}
