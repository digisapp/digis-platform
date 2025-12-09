import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, streams, streamMessages } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await params;
    const body = await req.json();
    const { username, userId: targetUserId } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Verify user is the stream owner
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: { creatorId: true },
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the stream creator can send shoutouts' }, { status: 403 });
    }

    // Get creator's username for the message
    const creator = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { username: true, displayName: true },
    });

    // Get target user's profile link if they exist
    const targetUser = targetUserId ? await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { username: true, avatarUrl: true },
    }) : null;

    const shoutoutMessage = `${creator?.displayName || creator?.username || 'The creator'} gave @${username} a shoutout!`;

    // Save shoutout message to database as a system message
    const [savedMessage] = await db.insert(streamMessages).values({
      streamId,
      userId: user.id,
      username: 'System',
      message: shoutoutMessage,
      messageType: 'system',
    }).returning();

    // Create message payload for broadcast
    const messagePayload = {
      id: savedMessage.id,
      streamId: savedMessage.streamId,
      userId: savedMessage.userId,
      username: 'System',
      message: shoutoutMessage,
      messageType: 'shoutout', // Special type for visual styling
      giftId: null,
      giftAmount: null,
      createdAt: savedMessage.createdAt,
      // Extra data for the shoutout
      shoutoutData: {
        targetUsername: username,
        targetUserId,
        targetAvatarUrl: targetUser?.avatarUrl || null,
        creatorUsername: creator?.username,
      },
    };

    // Broadcast to all viewers using Ably
    await AblyRealtimeService.broadcastChatMessage(streamId, messagePayload as any);

    return NextResponse.json({ success: true, message: messagePayload });
  } catch (error: any) {
    console.error('[streams/shoutout] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send shoutout' },
      { status: 500 }
    );
  }
}
