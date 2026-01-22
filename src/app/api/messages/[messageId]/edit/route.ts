import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { messages, conversations } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

// Maximum time (in minutes) after sending that a message can be edited
const EDIT_WINDOW_MINUTES = 5;

// PATCH /api/messages/[messageId]/edit - Edit a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Limit content length
    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Get the message
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    // Check edit window (5 minutes from creation)
    const createdAt = new Date(message.createdAt);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (minutesSinceCreation > EDIT_WINDOW_MINUTES) {
      return NextResponse.json(
        { error: `Messages can only be edited within ${EDIT_WINDOW_MINUTES} minutes of sending` },
        { status: 400 }
      );
    }

    // Don't allow editing certain message types
    if (message.messageType === 'tip' || message.messageType === 'system') {
      return NextResponse.json(
        { error: 'This type of message cannot be edited' },
        { status: 400 }
      );
    }

    // Update the message
    const [updatedMessage] = await db
      .update(messages)
      .set({
        content: content.trim(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))
      .returning();

    // Also update conversation's last message text if this was the last message
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, message.conversationId),
    });

    if (conversation && conversation.lastMessageSenderId === user.id) {
      // Check if this message is likely the last one (sent within last minute of lastMessageAt)
      const lastMessageAt = conversation.lastMessageAt;
      if (lastMessageAt) {
        const timeDiff = Math.abs(new Date(message.createdAt).getTime() - new Date(lastMessageAt).getTime());
        if (timeDiff < 60000) { // Within 1 minute
          await db
            .update(conversations)
            .set({
              lastMessageText: content.trim().substring(0, 100),
            })
            .where(eq(conversations.id, message.conversationId));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error: any) {
    console.error('Error editing message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to edit message' },
      { status: 500 }
    );
  }
}
