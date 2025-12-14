import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streams, streamBans } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/streams/[streamId]/ban - Ban a user (creator only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const { userId, reason } = await request.json();

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
      return NextResponse.json({ error: 'Only the stream creator can ban users' }, { status: 403 });
    }

    // Don't allow banning yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
    }

    // Check if already banned
    const existingBan = await db.query.streamBans.findFirst({
      where: and(eq(streamBans.streamId, streamId), eq(streamBans.userId, userId)),
    });

    if (existingBan) {
      return NextResponse.json({ success: true, message: 'User already banned' });
    }

    // Store ban in database
    await db.insert(streamBans).values({
      streamId,
      userId,
      bannedBy: user.id,
      reason: reason || null,
    });

    console.log(`[BAN] User ${userId} banned from stream ${streamId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error banning user:', error);
    return NextResponse.json(
      { error: 'Failed to ban user' },
      { status: 500 }
    );
  }
}

// DELETE /api/streams/[streamId]/ban - Unban a user (creator only)
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
      return NextResponse.json({ error: 'Only the stream creator can unban users' }, { status: 403 });
    }

    // Remove ban from database
    await db.delete(streamBans).where(
      and(eq(streamBans.streamId, streamId), eq(streamBans.userId, userId))
    );

    console.log(`[UNBAN] User ${userId} unbanned from stream ${streamId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unbanning user:', error);
    return NextResponse.json(
      { error: 'Failed to unban user' },
      { status: 500 }
    );
  }
}

// GET /api/streams/[streamId]/ban?userId=xxx - Check if user is banned
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

    // Check database for ban
    const ban = await db.query.streamBans.findFirst({
      where: and(eq(streamBans.streamId, streamId), eq(streamBans.userId, userId)),
    });

    return NextResponse.json({ isBanned: !!ban });
  } catch (error: any) {
    console.error('Error checking ban:', error);
    return NextResponse.json(
      { error: 'Failed to check ban' },
      { status: 500 }
    );
  }
}
