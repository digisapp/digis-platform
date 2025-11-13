import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, streamMessages } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
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
    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Get user details
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
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

    // Create message payload for broadcast
    const messagePayload = {
      id: savedMessage.id,
      username: dbUser.username || 'Anonymous',
      displayName: dbUser.displayName,
      avatarUrl: dbUser.avatarUrl,
      content: savedMessage.message,
      timestamp: savedMessage.createdAt.getTime(),
      type: 'message',
    };

    // Broadcast to all viewers using server-side Supabase client
    const channelName = `stream:${streamId}:chat`;
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'message',
      payload: messagePayload,
    });

    return NextResponse.json({ message: messagePayload, success: true });
  } catch (error: any) {
    console.error('[streams/message] Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
