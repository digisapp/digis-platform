import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { conversations, messages } from '@/db/schema/messages';
import { users } from '@/db/schema/users';
import { eq, asc, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAdminParams<{ conversationId: string }>(async ({ request, params }) => {
  try {
    const { conversationId } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Verify conversation exists and get participants
    const user1 = alias(users, 'user1');
    const user2 = alias(users, 'user2');

    const [conversation] = await db
      .select({
        id: conversations.id,
        user1Id: user1.id,
        user1Username: user1.username,
        user1DisplayName: user1.displayName,
        user1AvatarUrl: user1.avatarUrl,
        user1Role: user1.role,
        user2Id: user2.id,
        user2Username: user2.username,
        user2DisplayName: user2.displayName,
        user2AvatarUrl: user2.avatarUrl,
        user2Role: user2.role,
      })
      .from(conversations)
      .innerJoin(user1, eq(conversations.user1Id, user1.id))
      .innerJoin(user2, eq(conversations.user2Id, user2.id))
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get total message count
    const [{ total }] = await db
      .select({ total: count() })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    // Get messages with sender info
    const sender = alias(users, 'sender');
    const messageRows = await db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        isLocked: messages.isLocked,
        unlockPrice: messages.unlockPrice,
        tipAmount: messages.tipAmount,
        isAiGenerated: messages.isAiGenerated,
        senderId: sender.id,
        senderUsername: sender.username,
        senderDisplayName: sender.displayName,
        senderAvatarUrl: sender.avatarUrl,
      })
      .from(messages)
      .innerJoin(sender, eq(messages.senderId, sender.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedMessages = messageRows.map(m => ({
      id: m.id,
      content: m.content,
      messageType: m.messageType,
      createdAt: m.createdAt,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      isLocked: m.isLocked,
      unlockPrice: m.unlockPrice,
      tipAmount: m.tipAmount,
      isAiGenerated: m.isAiGenerated,
      sender: {
        id: m.senderId,
        username: m.senderUsername,
        displayName: m.senderDisplayName,
        avatarUrl: m.senderAvatarUrl,
      },
    }));

    return NextResponse.json({
      messages: formattedMessages,
      participants: {
        user1: {
          id: conversation.user1Id,
          username: conversation.user1Username,
          displayName: conversation.user1DisplayName,
          avatarUrl: conversation.user1AvatarUrl,
          role: conversation.user1Role,
        },
        user2: {
          id: conversation.user2Id,
          username: conversation.user2Username,
          displayName: conversation.user2DisplayName,
          avatarUrl: conversation.user2AvatarUrl,
          role: conversation.user2Role,
        },
      },
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
});
