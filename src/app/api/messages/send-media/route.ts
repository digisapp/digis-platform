import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { conversations, messages } from '@/lib/data/system';
import { eq, or, and } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Increase body size limit for large media uploads (500MB for videos)
export const maxDuration = 60; // 60 seconds timeout for large uploads

// File size limits (Vercel Pro has 5MB body limit)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 5MB for videos

// POST - Send media message (photo/video)
export async function POST(req: NextRequest) {
  try {
    // Rate limit media uploads (10/min per IP)
    const rl = await rateLimit(req, 'upload');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait before sending more media.' },
        { status: 429, headers: rl.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let recipientId: string;
    let caption: string;
    let isLocked: boolean;
    let unlockPrice: number;
    let mediaUrl: string;
    let mediaType: 'image' | 'video';
    let thumbnailUrl: string | null = null;

    // Check if this is a JSON request (from library) or FormData (new upload)
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Sending from library - no file upload needed
      const body = await req.json();
      recipientId = body.recipientId;
      caption = body.caption || '';
      isLocked = body.isLocked || false;
      unlockPrice = body.unlockPrice || 0;
      mediaUrl = body.mediaUrl;
      mediaType = body.mediaType || 'image';

      if (!mediaUrl || !recipientId) {
        return NextResponse.json({ error: 'Media URL and recipient required' }, { status: 400 });
      }

      thumbnailUrl = mediaType === 'image' ? mediaUrl : null;
      console.log(`[send-media] Sending from library: ${mediaType}`);
    } else {
      // New file upload via FormData
      const formData = await req.formData();
      const file = formData.get('file') as File;
      recipientId = formData.get('recipientId') as string;
      caption = formData.get('caption') as string || '';
      isLocked = formData.get('isLocked') === 'true';
      unlockPrice = parseInt(formData.get('unlockPrice') as string || '0');

      if (!file || !recipientId) {
        return NextResponse.json({ error: 'File and recipient required' }, { status: 400 });
      }

      // Validate file type
      const fileMediaType = file.type.startsWith('image/') ? 'image' :
                        file.type.startsWith('video/') ? 'video' : null;

      if (!fileMediaType) {
        return NextResponse.json({ error: 'Invalid file type. Only images and videos allowed.' }, { status: 400 });
      }
      mediaType = fileMediaType;

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

      // Log file size for debugging
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`[send-media] Uploading ${mediaType}: ${fileSizeMB}MB`);

      // Convert File to ArrayBuffer for upload
      let arrayBuffer: ArrayBuffer;
      try {
        arrayBuffer = await file.arrayBuffer();
      } catch (bufferError) {
        console.error('Error reading file buffer:', bufferError);
        return NextResponse.json({
          error: 'Failed to read file. The file may be too large.'
        }, { status: 400 });
      }

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

      console.log(`[send-media] Upload successful: ${filePath}`);

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('message-media')
        .getPublicUrl(filePath);

      mediaUrl = urlData.publicUrl;
      thumbnailUrl = mediaType === 'image' ? mediaUrl : null;
    }

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
