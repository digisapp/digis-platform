import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, streamMessages, streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { BlockService } from '@/lib/services/block-service';
import { AiStreamChatService } from '@/lib/services/ai-stream-chat-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Check timeout/ban status via internal fetch
async function checkModerationStatus(streamId: string, userId: string, baseUrl: string): Promise<{ isBanned: boolean; isTimedOut: boolean; checkFailed: boolean }> {
  try {
    const [banResponse, timeoutResponse] = await Promise.all([
      fetch(`${baseUrl}/api/streams/${streamId}/ban?userId=${userId}`),
      fetch(`${baseUrl}/api/streams/${streamId}/timeout?userId=${userId}`),
    ]);

    // Check if both requests succeeded
    if (!banResponse.ok || !timeoutResponse.ok) {
      console.error('[Message] Moderation check failed - ban status:', banResponse.status, 'timeout status:', timeoutResponse.status);
      return { isBanned: false, isTimedOut: false, checkFailed: true };
    }

    const banData = await banResponse.json();
    const timeoutData = await timeoutResponse.json();

    return {
      isBanned: banData.isBanned || false,
      isTimedOut: timeoutData.isTimedOut || false,
      checkFailed: false,
    };
  } catch (error) {
    console.error('[Message] Error checking moderation status:', error);
    // Fail closed - if we can't check, don't allow the message (security)
    return { isBanned: false, isTimedOut: false, checkFailed: true };
  }
}

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

    // Check if user is banned or timed out
    const baseUrl = req.nextUrl.origin;
    const { isBanned, isTimedOut, checkFailed } = await checkModerationStatus(streamId, user.id, baseUrl);

    // If moderation check failed, block the message for security (fail closed)
    if (checkFailed) {
      return NextResponse.json({ error: 'Unable to verify your status. Please try again.' }, { status: 503 });
    }

    if (isBanned) {
      return NextResponse.json({ error: 'You have been banned from this stream' }, { status: 403 });
    }

    if (isTimedOut) {
      return NextResponse.json({ error: 'You are currently timed out' }, { status: 403 });
    }

    // Check if user is blocked by the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: { creatorId: true },
    });

    if (stream && stream.creatorId !== user.id) {
      const isBlocked = await BlockService.isBlockedByCreator(stream.creatorId, user.id);
      if (isBlocked) {
        return NextResponse.json({ error: 'You cannot send messages in this stream' }, { status: 403 });
      }
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('[streams/message] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const content = body?.content || body?.message; // Support both field names

    console.log('[streams/message] Received:', { streamId, body, content, userId: user.id });

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({
        error: 'Message cannot be empty',
        debug: { receivedBody: body, contentValue: content }
      }, { status: 400 });
    }

    // Limit message length for chat (500 chars max)
    const MAX_CHAT_LENGTH = 500;
    if (content.trim().length > MAX_CHAT_LENGTH) {
      return NextResponse.json({
        error: `Message too long. Maximum ${MAX_CHAT_LENGTH} characters allowed.`
      }, { status: 400 });
    }

    // Get user details including spend tier
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        spendTier: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Save message to database
    const [savedMessage] = await db.insert(streamMessages).values({
      streamId,
      userId: user.id,
      username: dbUser.username || 'Anonymous',
      message: content,
      messageType: 'chat',
    }).returning();

    // Create message payload for broadcast (must match StreamMessage type for realtime handler)
    const messagePayload = {
      id: savedMessage.id,
      streamId: savedMessage.streamId,
      userId: savedMessage.userId,
      username: dbUser.username || 'Anonymous',
      message: savedMessage.message,
      messageType: savedMessage.messageType,
      giftId: savedMessage.giftId,
      giftAmount: savedMessage.giftAmount,
      createdAt: savedMessage.createdAt,
      // Extra fields for display
      user: {
        avatarUrl: dbUser.avatarUrl,
        spendTier: dbUser.spendTier,
      },
    };

    // Broadcast to all viewers using Ably (scales to 50k+ concurrent users)
    await AblyRealtimeService.broadcastChatMessage(streamId, messagePayload as any);

    // Trigger AI Chat Moderator response (async, don't block)
    if (stream?.creatorId) {
      AiStreamChatService.processMessage(streamId, stream.creatorId, {
        id: savedMessage.id,
        userId: user.id,
        username: dbUser.username || 'Anonymous',
        message: content,
        messageType: 'chat',
      }).catch(err => {
        console.error('[AI Stream Chat] Error processing message:', err);
      });
    }

    return NextResponse.json({ message: messagePayload, success: true });
  } catch (error: any) {
    console.error('[streams/message] Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
