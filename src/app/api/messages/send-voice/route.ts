import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { conversations, messages } from '@/lib/data/system';
import { eq, or, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Send voice message
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const recipientId = formData.get('recipientId') as string;
    const duration = parseInt(formData.get('duration') as string || '0');

    if (!file || !recipientId) {
      return NextResponse.json({ error: 'Audio file and recipient required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Invalid file type. Only audio files allowed.' }, { status: 400 });
    }

    // Validate duration
    if (duration < 1) {
      return NextResponse.json({ error: 'Voice message must be at least 1 second' }, { status: 400 });
    }

    // TODO: Upload file to storage (Supabase Storage, AWS S3, etc.)
    // For now, we'll use a placeholder URL
    // In production, this would be:
    // const { data: uploadData, error: uploadError } = await supabase.storage
    //   .from('voice-messages')
    //   .upload(`${user.id}/${Date.now()}-${file.name}`, file);

    // PLACEHOLDER: In production, replace with actual storage upload
    const mediaUrl = `/api/placeholder-voice/${Date.now()}.webm`;

    // Find or create conversation
    let conversation = await db.query.conversations.findFirst({
      where: or(
        and(
          eq(conversations.user1Id, user.id),
          eq(conversations.user2Id, recipientId)
        ),
        and(
          eq(conversations.user1Id, recipientId),
          eq(conversations.user2Id, user.id)
        )
      ),
    });

    if (!conversation) {
      // Create new conversation
      const [newConversation] = await db
        .insert(conversations)
        .values({
          user1Id: user.id,
          user2Id: recipientId,
        })
        .returning();

      conversation = newConversation;
    }

    // Create message with voice data
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderId: user.id,
        content: `Voice message (${duration}s)`,
        messageType: 'media',
        mediaUrl,
        mediaType: 'audio',
        thumbnailUrl: null,
        isLocked: false,
        unlockPrice: null,
      })
      .returning();

    // Update conversation last message
    await db
      .update(conversations)
      .set({
        lastMessageText: `Voice message (${duration}s)`,
        lastMessageAt: new Date(),
        lastMessageSenderId: user.id,
        // Increment unread count for recipient
        ...(conversation.user1Id === recipientId
          ? { user1UnreadCount: String(parseInt(conversation.user1UnreadCount) + 1) }
          : { user2UnreadCount: String(parseInt(conversation.user2UnreadCount) + 1) }
        ),
      })
      .where(eq(conversations.id, conversation.id));

    return NextResponse.json({
      success: true,
      message,
      note: 'Voice file upload to storage not yet implemented. Using placeholder URL.',
    });
  } catch (error) {
    console.error('Error sending voice message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send voice message' },
      { status: 500 }
    );
  }
}
