import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { conversations, messages } from '@/lib/data/system';
import { eq, or, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// File size limits
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB for images
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB for videos

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

    // Validate file size
    const maxSize = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json({
        error: `File too large. Maximum size for ${mediaType}s is ${maxSizeMB}MB.`
      }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()?.toLowerCase() || (mediaType === 'image' ? 'jpg' : 'mp4');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${recipientId}/${fileName}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('message-media')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({
        error: `Failed to upload file: ${uploadError.message}`
      }, { status: 500 });
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('message-media')
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;

    // For locked content, create a blurred thumbnail
    // For images, we use the same URL (client will blur it)
    // For videos, we'd ideally generate a thumbnail, but for now use null
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
    });
  } catch (error) {
    console.error('Error sending media:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send media' },
      { status: 500 }
    );
  }
}
