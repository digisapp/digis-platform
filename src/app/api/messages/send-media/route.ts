import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { conversations, messages } from '@/lib/data/system';
import { eq, or, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Send media message (photo/video)
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
    const caption = formData.get('caption') as string || '';
    const isLocked = formData.get('isLocked') === 'true';
    const unlockPrice = parseInt(formData.get('unlockPrice') as string || '0');

    if (!file || !recipientId) {
      return NextResponse.json({ error: 'File and recipient required' }, { status: 400 });
    }

    // Validate file type
    const mediaType = file.type.startsWith('image/') ? 'image' :
                      file.type.startsWith('video/') ? 'video' : null;

    if (!mediaType) {
      return NextResponse.json({ error: 'Invalid file type. Only images and videos allowed.' }, { status: 400 });
    }

    // TODO: Upload file to storage (Supabase Storage, AWS S3, etc.)
    // For now, we'll use a placeholder URL
    // In production, this would be:
    // const { data: uploadData, error: uploadError } = await supabase.storage
    //   .from('message-media')
    //   .upload(`${user.id}/${Date.now()}-${file.name}`, file);

    // PLACEHOLDER: In production, replace with actual storage upload
    const mediaUrl = `/api/placeholder-media/${file.name}`;
    const thumbnailUrl = mediaType === 'image' ? mediaUrl : null;

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

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderId: user.id,
        content: caption || `Sent a ${mediaType}`,
        messageType: isLocked ? 'locked' : 'media',
        mediaUrl,
        mediaType,
        thumbnailUrl,
        isLocked,
        unlockPrice: isLocked ? unlockPrice : null,
      })
      .returning();

    // Update conversation last message
    await db
      .update(conversations)
      .set({
        lastMessageText: caption || `Sent a ${mediaType}`,
        lastMessageAt: new Date(),
        lastMessageSenderId: user.id,
        // Increment unread count for recipient
        ...(conversation.user1Id === recipientId
          ? { user1UnreadCount: conversation.user1UnreadCount + 1 }
          : { user2UnreadCount: conversation.user2UnreadCount + 1 }
        ),
      })
      .where(eq(conversations.id, conversation.id));

    return NextResponse.json({
      success: true,
      message,
      note: 'File upload to storage not yet implemented. Using placeholder URL.',
    });
  } catch (error) {
    console.error('Error sending media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send media' },
      { status: 500 }
    );
  }
}
