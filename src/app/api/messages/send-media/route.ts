import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { conversations, messages, users, creatorSettings, wallets, walletTransactions } from '@/lib/data/system';
import { eq, or, and, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Increase body size limit for large media uploads (500MB for videos)
export const maxDuration = 60; // 60 seconds timeout for large uploads

// File size limits (Vercel Pro has 5MB body limit)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_VIDEO_SIZE = 5 * 1024 * 1024; // 5MB for videos

// Magic number validation to prevent MIME type spoofing
function validateFileMagicNumbers(bytes: Uint8Array, expectedType: 'image' | 'video'): boolean {
  if (bytes.length < 12) return false;

  if (expectedType === 'image') {
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
    return false;
  }

  if (expectedType === 'video') {
    // MP4/MOV: ftyp at offset 4
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true;
    // WebM: 1A 45 DF A3
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true;
    // AVI: 52 49 46 46 ... 41 56 49
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49) return true;
    return false;
  }

  return false;
}

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

      // Validate file content matches declared MIME type (prevent spoofing)
      if (!validateFileMagicNumbers(fileBuffer, mediaType)) {
        console.warn(`[send-media] Magic number mismatch for declared type: ${file.type}`);
        return NextResponse.json({
          error: 'Invalid file content. File does not match declared type.'
        }, { status: 400 });
      }

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

    // Check if sender needs to pay (fan sending to creator)
    const sender = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    const recipient = await db.query.users.findFirst({
      where: eq(users.id, recipientId),
      columns: { id: true, role: true },
    });

    let messageCharge = 0;

    // If fan sending to creator, charge messageRate
    if (sender?.role !== 'creator' && recipient?.role === 'creator') {
      const creatorSetting = await db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, recipientId),
      });

      messageCharge = creatorSetting?.messageRate || 0;

      if (messageCharge > 0) {
        // Check sender's balance
        const senderWallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, user.id),
        });

        if (!senderWallet || senderWallet.balance < messageCharge) {
          return NextResponse.json(
            { error: `Insufficient balance. You need ${messageCharge} coins to send media.` },
            { status: 402 }
          );
        }

        // Deduct from sender
        await db
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${messageCharge}` })
          .where(eq(wallets.userId, user.id));

        // Credit to creator
        await db
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${messageCharge}` })
          .where(eq(wallets.userId, recipientId));

        // Create transaction records
        await db.insert(walletTransactions).values({
          userId: user.id,
          amount: -messageCharge,
          type: 'message',
          status: 'completed',
          description: 'Media message to creator',
        });

        await db.insert(walletTransactions).values({
          userId: recipientId,
          amount: messageCharge,
          type: 'message',
          status: 'completed',
          description: 'Media message from fan',
        });
      }
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
