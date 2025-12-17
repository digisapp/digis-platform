import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { db } from '@/lib/data/system';
import { subscriptions, follows, conversations, messages } from '@/lib/data/system';
import { eq, and, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for mass messaging

// POST - Send broadcast message to multiple recipients
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator
    const userProfile = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!userProfile || userProfile.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can send broadcasts' }, { status: 403 });
    }

    // Parse form data
    const formData = await req.formData();
    const messageType = formData.get('messageType') as string;
    const targetAudience = formData.get('targetAudience') as 'subscribers' | 'followers' | 'all';

    // Get recipient list based on target audience
    let recipientIds: string[] = [];

    if (targetAudience === 'subscribers' || targetAudience === 'all') {
      // Get all active subscribers
      const subs = await db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.creatorId, user.id),
            eq(subscriptions.status, 'active'),
            sql`${subscriptions.expiresAt} > NOW()`
          )
        );

      recipientIds.push(...subs.map(s => s.userId));
    }

    if (targetAudience === 'followers' || targetAudience === 'all') {
      // Get all followers
      const followers = await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(eq(follows.followingId, user.id));

      recipientIds.push(...followers.map(f => f.followerId));
    }

    // Remove duplicates (users who are both subscribers and followers)
    recipientIds = [...new Set(recipientIds)];

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    // SECURITY: Limit max recipients to prevent DoS
    const MAX_RECIPIENTS = 10000;
    if (recipientIds.length > MAX_RECIPIENTS) {
      return NextResponse.json({
        error: `Too many recipients. Maximum allowed: ${MAX_RECIPIENTS}`
      }, { status: 400 });
    }

    // Handle message type
    let messageContent: string;
    let messageTypeDb: 'text' | 'media' | 'locked';
    let mediaUrl: string | null = null;
    let mediaTypeValue: string | null = null;
    let thumbnailUrl: string | null = null;
    let isLocked = false;
    let unlockPrice: number | null = null;

    if (messageType === 'text') {
      messageContent = formData.get('message') as string;
      messageTypeDb = 'text';

      if (!messageContent || !messageContent.trim()) {
        return NextResponse.json({ error: 'Message content required' }, { status: 400 });
      }
    } else if (messageType === 'media') {
      const file = formData.get('file') as File;
      const caption = formData.get('caption') as string || '';
      isLocked = formData.get('isLocked') === 'true';
      unlockPrice = isLocked ? parseInt(formData.get('unlockPrice') as string || '0') : null;

      if (!file) {
        return NextResponse.json({ error: 'File required for media message' }, { status: 400 });
      }

      // Validate file type
      const fileMediaType = file.type.startsWith('image/') ? 'image' :
                           file.type.startsWith('video/') ? 'video' : null;

      if (!fileMediaType) {
        return NextResponse.json({ error: 'Invalid file type. Only images and videos allowed.' }, { status: 400 });
      }

      // Upload file to Supabase Storage
      try {
        const fileBuffer = await file.arrayBuffer();
        const fileExtension = file.name.split('.').pop() || 'bin';
        const fileName = `${user.id}/${uuidv4()}.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('message-media')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Failed to upload broadcast media:', uploadError);
          return NextResponse.json({ error: 'Failed to upload media file' }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('message-media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaTypeValue = fileMediaType;
        thumbnailUrl = fileMediaType === 'image' ? publicUrl : null;
      } catch (uploadErr) {
        console.error('Error uploading broadcast media:', uploadErr);
        return NextResponse.json({ error: 'Failed to upload media file' }, { status: 500 });
      }

      messageContent = caption || `Sent a ${fileMediaType}`;
      messageTypeDb = isLocked ? 'locked' : 'media';
    } else {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    // PERFORMANCE: Batch-fetch all existing conversations with recipients first
    // This avoids N+1 queries when finding conversations
    // SECURITY: Using inArray() for parameterized queries instead of sql.raw()
    const existingConversations = await db.query.conversations.findMany({
      where: or(
        and(
          eq(conversations.user1Id, user.id),
          inArray(conversations.user2Id, recipientIds)
        ),
        and(
          eq(conversations.user2Id, user.id),
          inArray(conversations.user1Id, recipientIds)
        )
      ),
    });

    // Create a map for quick lookup
    const conversationMap = new Map<string, typeof existingConversations[0]>();
    existingConversations.forEach(conv => {
      const recipientId = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
      conversationMap.set(recipientId, conv);
    });

    // Find recipients without existing conversations
    const recipientsWithoutConv = recipientIds.filter(id => !conversationMap.has(id));

    // Batch-create new conversations for recipients who don't have one
    if (recipientsWithoutConv.length > 0) {
      const newConversations = await db
        .insert(conversations)
        .values(recipientsWithoutConv.map(recipientId => ({
          user1Id: user.id,
          user2Id: recipientId,
        })))
        .returning();

      // Add to map
      newConversations.forEach(conv => {
        conversationMap.set(conv.user2Id, conv);
      });
    }

    // Batch-insert all messages at once
    const messageValues = recipientIds.map(recipientId => {
      const conv = conversationMap.get(recipientId)!;
      return {
        conversationId: conv.id,
        senderId: user.id,
        content: messageContent,
        messageType: messageTypeDb,
        mediaUrl,
        mediaType: mediaTypeValue,
        thumbnailUrl,
        isLocked,
        unlockPrice,
      };
    });

    await db.insert(messages).values(messageValues);

    // Batch-update all conversation metadata
    // Use SQL CASE for conditional unread count increment
    const now = new Date();
    let successCount = recipientIds.length;
    let failedCount = 0;

    try {
      // Update conversations in parallel batches of 50 for performance
      const BATCH_SIZE = 50;
      const conversationUpdates = recipientIds.map(recipientId => {
        const conv = conversationMap.get(recipientId)!;
        const isUser1Recipient = conv.user1Id === recipientId;
        return db
          .update(conversations)
          .set({
            lastMessageText: messageContent,
            lastMessageAt: now,
            lastMessageSenderId: user.id,
            ...(isUser1Recipient
              ? { user1UnreadCount: conv.user1UnreadCount + 1 }
              : { user2UnreadCount: conv.user2UnreadCount + 1 }
            ),
          })
          .where(eq(conversations.id, conv.id));
      });

      // Process in batches
      for (let i = 0; i < conversationUpdates.length; i += BATCH_SIZE) {
        const batch = conversationUpdates.slice(i, i + BATCH_SIZE);
        await Promise.all(batch);
      }
    } catch (error) {
      console.error('Error updating conversations:', error);
      // Messages were sent, just metadata update failed
    }

    return NextResponse.json({
      success: true,
      recipientCount: successCount,
      failedCount: failedCount,
      totalAttempts: recipientIds.length,
    });
  } catch (error) {
    // Log full error server-side, return generic message to client
    console.error('Error sending broadcast:', error);
    return NextResponse.json(
      { error: 'Failed to send broadcast. Please try again later.' },
      { status: 500 }
    );
  }
}
