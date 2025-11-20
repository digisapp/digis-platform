import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { subscriptions, follows, conversations, messages } from '@/lib/data/system';
import { eq, and, or, sql } from 'drizzle-orm';

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

      // TODO: Upload file to storage (Supabase Storage, AWS S3, etc.)
      // For now, we'll use a placeholder URL
      mediaUrl = `/api/placeholder-broadcast/${Date.now()}-${file.name}`;
      mediaTypeValue = fileMediaType;
      thumbnailUrl = fileMediaType === 'image' ? mediaUrl : null;

      messageContent = caption || `Sent a ${fileMediaType}`;
      messageTypeDb = isLocked ? 'locked' : 'media';
    } else {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }

    // Send message to each recipient
    const successCount = { value: 0 };
    const failedCount = { value: 0 };

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        try {
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
          await db.insert(messages).values({
            conversationId: conversation.id,
            senderId: user.id,
            content: messageContent,
            messageType: messageTypeDb,
            mediaUrl,
            mediaType: mediaTypeValue,
            thumbnailUrl,
            isLocked,
            unlockPrice,
          });

          // Update conversation last message
          await db
            .update(conversations)
            .set({
              lastMessageText: messageContent,
              lastMessageAt: new Date(),
              lastMessageSenderId: user.id,
              // Increment unread count for recipient
              ...(conversation.user1Id === recipientId
                ? { user1UnreadCount: conversation.user1UnreadCount + 1 }
                : { user2UnreadCount: conversation.user2UnreadCount + 1 }
              ),
            })
            .where(eq(conversations.id, conversation.id));

          successCount.value++;
        } catch (error) {
          console.error(`Failed to send message to ${recipientId}:`, error);
          failedCount.value++;
        }
      })
    );

    return NextResponse.json({
      success: true,
      recipientCount: successCount.value,
      failedCount: failedCount.value,
      totalAttempts: recipientIds.length,
      note: messageType === 'media' ? 'File upload to storage not yet implemented. Using placeholder URL.' : undefined,
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}
