import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { conversations, messages } from '@/lib/data/system';
import { eq, or, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// File size limit for voice messages (25MB)
const MAX_VOICE_SIZE = 25 * 1024 * 1024;

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

    // Validate file size
    if (file.size > MAX_VOICE_SIZE) {
      return NextResponse.json({
        error: 'Voice message too large. Maximum size is 25MB.'
      }, { status: 400 });
    }

    // Validate duration
    if (duration < 1) {
      return NextResponse.json({ error: 'Voice message must be at least 1 second' }, { status: 400 });
    }

    // Upload file to Supabase Storage
    // Use file extension based on actual mime type
    const ext = file.type.includes('webm') ? 'webm' : file.type.includes('mp4') ? 'm4a' : 'audio';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `${user.id}/${recipientId}/${fileName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    console.log('[send-voice] Uploading:', {
      filePath,
      fileType: file.type,
      fileSize: file.size,
      duration,
    });

    // Try to upload to voice-messages bucket
    const { error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'audio/webm',
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error('[send-voice] Storage upload error:', uploadError);

      // Check if bucket doesn't exist
      if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
        return NextResponse.json({
          error: 'Voice messages are not configured. Please contact support.'
        }, { status: 500 });
      }

      // Check for permission errors
      if (uploadError.message.includes('permission') || uploadError.message.includes('policy')) {
        return NextResponse.json({
          error: 'Unable to save voice message. Storage permissions error.'
        }, { status: 500 });
      }

      return NextResponse.json({
        error: `Failed to upload voice message: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;

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
          ? { user1UnreadCount: conversation.user1UnreadCount + 1 }
          : { user2UnreadCount: conversation.user2UnreadCount + 1 }
        ),
      })
      .where(eq(conversations.id, conversation.id));

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error sending voice message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send voice message' },
      { status: 500 }
    );
  }
}
