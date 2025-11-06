import { db } from '@/db';
import {
  conversations,
  messages,
  messageRequests,
  users,
} from '@/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class MessageService {
  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(user1Id: string, user2Id: string) {
    // Always order IDs consistently to find existing conversation
    const [smallerId, largerId] = [user1Id, user2Id].sort();

    // Try to find existing conversation
    let conversation = await db.query.conversations.findFirst({
      where: or(
        and(
          eq(conversations.user1Id, smallerId),
          eq(conversations.user2Id, largerId)
        ),
        and(
          eq(conversations.user1Id, largerId),
          eq(conversations.user2Id, smallerId)
        )
      ),
      with: {
        user1: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
        user2: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (conversation) {
      return conversation;
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        user1Id: smallerId,
        user2Id: largerId,
      })
      .returning();

    // Fetch with user details
    conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, newConversation.id),
      with: {
        user1: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
        user2: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return conversation!;
  }

  /**
   * Send a message
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string
  ) {
    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content,
        mediaUrl,
        mediaType,
      })
      .returning();

    // Update conversation's last message
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (conversation) {
      // Determine which user is receiving
      const receiverId =
        conversation.user1Id === senderId
          ? conversation.user2Id
          : conversation.user1Id;

      // Increment unread count for receiver
      const unreadCountField =
        conversation.user1Id === receiverId
          ? 'user1_unread_count'
          : 'user2_unread_count';

      await db
        .update(conversations)
        .set({
          lastMessageText: content.substring(0, 100),
          lastMessageAt: new Date(),
          lastMessageSenderId: senderId,
          [unreadCountField]: sql`CAST(${conversations[unreadCountField as keyof typeof conversations]} AS INTEGER) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    }

    // Return message with sender info
    const messageWithSender = await db.query.messages.findFirst({
      where: eq(messages.id, message.id),
      with: {
        sender: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return messageWithSender!;
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(conversationId: string, limit: number = 50, offset: number = 0) {
    return await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [desc(messages.createdAt)],
      limit,
      offset,
      with: {
        sender: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Mark messages as read
   */
  static async markAsRead(conversationId: string, userId: string) {
    // Get conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Mark all unread messages from other user as read
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false),
          sql`${messages.senderId} != ${userId}`
        )
      );

    // Reset unread count for this user
    const unreadCountField =
      conversation.user1Id === userId
        ? 'user1_unread_count'
        : 'user2_unread_count';

    await db
      .update(conversations)
      .set({
        [unreadCountField]: '0',
      })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string) {
    const allConversations = await db.query.conversations.findMany({
      where: or(
        eq(conversations.user1Id, userId),
        eq(conversations.user2Id, userId)
      ),
      orderBy: [desc(conversations.lastMessageAt)],
      with: {
        user1: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        user2: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        lastMessageSender: {
          columns: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    });

    // Transform to include "other user" and unread count
    return allConversations.map((conv) => {
      const isUser1 = conv.user1Id === userId;
      const otherUser = isUser1 ? conv.user2 : conv.user1;
      const unreadCount = isUser1
        ? parseInt(conv.user1UnreadCount)
        : parseInt(conv.user2UnreadCount);
      const isArchived = isUser1 ? conv.user1Archived : conv.user2Archived;
      const isPinned = isUser1 ? conv.user1Pinned : conv.user2Pinned;

      return {
        ...conv,
        otherUser,
        unreadCount,
        isArchived,
        isPinned,
      };
    });
  }

  /**
   * Create a message request
   */
  static async createMessageRequest(
    fromUserId: string,
    toUserId: string,
    initialMessage: string,
    isPaid: boolean = false,
    paidAmount: number = 0
  ) {
    // Check if request already exists
    const existing = await db.query.messageRequests.findFirst({
      where: and(
        eq(messageRequests.fromUserId, fromUserId),
        eq(messageRequests.toUserId, toUserId),
        eq(messageRequests.status, 'pending')
      ),
    });

    if (existing) {
      throw new Error('You already have a pending message request to this user');
    }

    // Create request
    const [request] = await db
      .insert(messageRequests)
      .values({
        fromUserId,
        toUserId,
        initialMessage,
        isPaid,
        paidAmount: paidAmount.toString(),
      })
      .returning();

    return request;
  }

  /**
   * Accept a message request
   */
  static async acceptMessageRequest(requestId: string) {
    const request = await db.query.messageRequests.findFirst({
      where: eq(messageRequests.id, requestId),
    });

    if (!request) {
      throw new Error('Message request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Message request already responded to');
    }

    // Create conversation
    const conversation = await this.getOrCreateConversation(
      request.fromUserId,
      request.toUserId
    );

    // Send the initial message
    await this.sendMessage(
      conversation.id,
      request.fromUserId,
      request.initialMessage
    );

    // Update request
    await db
      .update(messageRequests)
      .set({
        status: 'accepted',
        conversationId: conversation.id,
        respondedAt: new Date(),
      })
      .where(eq(messageRequests.id, requestId));

    return conversation;
  }

  /**
   * Decline a message request
   */
  static async declineMessageRequest(requestId: string) {
    await db
      .update(messageRequests)
      .set({
        status: 'declined',
        respondedAt: new Date(),
      })
      .where(eq(messageRequests.id, requestId));
  }

  /**
   * Get pending message requests for a user
   */
  static async getPendingRequests(userId: string) {
    return await db.query.messageRequests.findMany({
      where: and(
        eq(messageRequests.toUserId, userId),
        eq(messageRequests.status, 'pending')
      ),
      orderBy: [desc(messageRequests.createdAt)],
      with: {
        fromUser: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Archive/unarchive conversation
   */
  static async archiveConversation(conversationId: string, userId: string, archive: boolean) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const archiveField =
      conversation.user1Id === userId ? 'user1_archived' : 'user2_archived';

    await db
      .update(conversations)
      .set({
        [archiveField]: archive,
      })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Pin/unpin conversation
   */
  static async pinConversation(conversationId: string, userId: string, pin: boolean) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const pinField =
      conversation.user1Id === userId ? 'user1_pinned' : 'user2_pinned';

    await db
      .update(conversations)
      .set({
        [pinField]: pin,
      })
      .where(eq(conversations.id, conversationId));
  }

  /**
   * Delete conversation (for a specific user)
   */
  static async deleteConversation(conversationId: string, userId: string) {
    // For now, just archive it
    // In production, you might want to actually delete messages or mark them as deleted
    await this.archiveConversation(conversationId, userId, true);
  }

  /**
   * Get total unread count for a user
   */
  static async getTotalUnreadCount(userId: string) {
    const convos = await this.getUserConversations(userId);
    return convos.reduce((total, conv) => total + conv.unreadCount, 0);
  }
}
