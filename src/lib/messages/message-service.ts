import { db } from '@/lib/data/system';
import {
  conversations,
  messages,
  messageRequests,
  users,
  blockedUsers,
  walletTransactions,
  wallets,
  creatorSettings,
  subscriptions,
  calls,
  contentPurchases,
  streamGifts,
} from '@/lib/data/system';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Cold outreach fee - creators pay 50 coins to message fans they don't have a relationship with
const COLD_OUTREACH_FEE = 50;

export class MessageService {
  /**
   * Check if sender has a relationship with recipient
   * Relationship exists if recipient has: tipped, subscribed, messaged first, been on call, or purchased content
   */
  static async hasRelationship(senderId: string, recipientId: string): Promise<boolean> {
    // Check if they already have a conversation (recipient messaged first)
    const existingConversation = await db.query.conversations.findFirst({
      where: or(
        and(
          eq(conversations.user1Id, senderId),
          eq(conversations.user2Id, recipientId)
        ),
        and(
          eq(conversations.user1Id, recipientId),
          eq(conversations.user2Id, senderId)
        )
      ),
    });

    // If conversation exists, check if recipient sent the first message
    if (existingConversation) {
      const firstMessage = await db.query.messages.findFirst({
        where: eq(messages.conversationId, existingConversation.id),
        orderBy: [messages.createdAt],
      });

      if (firstMessage && firstMessage.senderId === recipientId) {
        return true; // Recipient messaged first, so relationship exists
      }
    }

    // Check if recipient has sent gifts to sender in any stream
    const hasSentGifts = await db.query.streamGifts.findFirst({
      where: and(
        eq(streamGifts.senderId, recipientId),
        eq(streamGifts.recipientId, senderId)
      ),
    });

    if (hasSentGifts) return true;

    // Check if recipient is subscribed to sender
    const hasSubscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, recipientId),
        eq(subscriptions.creatorId, senderId),
        eq(subscriptions.status, 'active')
      ),
    });

    if (hasSubscription) return true;

    // Check if recipient has had a call with sender
    const hasCall = await db.query.calls.findFirst({
      where: and(
        eq(calls.fanId, recipientId),
        eq(calls.creatorId, senderId),
        eq(calls.status, 'completed')
      ),
    });

    if (hasCall) return true;

    // Check if recipient has purchased sender's content
    const hasPurchasedContent = await db.query.contentPurchases.findFirst({
      where: and(
        eq(contentPurchases.userId, recipientId),
        sql`${contentPurchases.contentId} IN (SELECT id FROM content_items WHERE creator_id = ${senderId})`
      ),
    });

    if (hasPurchasedContent) return true;

    // No relationship found
    return false;
  }
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
    // Get conversation to determine receiver
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Determine receiver
    const receiverId =
      conversation.user1Id === senderId
        ? conversation.user2Id
        : conversation.user1Id;

    // Get sender and receiver info
    const [sender, receiver] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, senderId) }),
      db.query.users.findFirst({ where: eq(users.id, receiverId) }),
    ]);

    if (!sender || !receiver) {
      throw new Error('User not found');
    }

    let messageCost = 0;

    // COLD OUTREACH FEE: Charge creators 50 coins to message fans without a relationship
    // Check if this is the first message in the conversation (cold outreach)
    const existingMessages = await db.query.messages.findFirst({
      where: eq(messages.conversationId, conversationId),
    });

    const isFirstMessage = !existingMessages;

    if (isFirstMessage && sender.role === 'creator' && receiver.role !== 'creator') {
      // Sender is a creator, receiver is a fan - check if they have a relationship
      const hasRelationship = await MessageService.hasRelationship(senderId, receiverId);

      if (!hasRelationship) {
        // No relationship - charge cold outreach fee
        const senderWallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, senderId),
        });

        if (!senderWallet || senderWallet.balance < COLD_OUTREACH_FEE) {
          throw new Error(`Insufficient balance. You need ${COLD_OUTREACH_FEE} coins to message users you don't have a relationship with.`);
        }

        // Charge the cold outreach fee (platform keeps 100%)
        const transactionId = uuidv4();

        await db.insert(walletTransactions).values({
          userId: senderId,
          amount: -COLD_OUTREACH_FEE,
          type: 'cold_outreach_fee',
          status: 'completed',
          description: `Message unlock: ${receiver.displayName || receiver.username}`,
          idempotencyKey: `${transactionId}-cold-outreach`,
        });

        // Update sender's wallet balance
        await db
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${COLD_OUTREACH_FEE}`,
          })
          .where(eq(wallets.userId, senderId));

        messageCost = COLD_OUTREACH_FEE; // Track total cost
      }
    }

    if (receiver && receiver.role === 'creator') {
      // Get creator settings to check message rate
      const settings = await db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, receiverId),
      });

      if (settings && settings.messageRate > 0) {
        messageCost = settings.messageRate;

        // Check sender's balance
        const senderWallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, senderId),
        });

        if (!senderWallet || senderWallet.balance < messageCost) {
          throw new Error(`Insufficient balance. This creator charges ${messageCost} coins per message.`);
        }

        // Process payment
        const transactionId = uuidv4();

        // Deduct from sender
        await db.insert(walletTransactions).values({
          userId: senderId,
          amount: -messageCost,
          type: 'message_charge',
          status: 'completed',
          description: `Message to ${receiver.displayName || receiver.username}`,
          idempotencyKey: `${transactionId}-debit`,
        });

        // Credit to receiver (creator)
        await db.insert(walletTransactions).values({
          userId: receiverId,
          amount: messageCost,
          type: 'message_earnings',
          status: 'completed',
          description: `Message from ${senderWallet ? 'fan' : 'user'}`,
          idempotencyKey: `${transactionId}-credit`,
        });

        // Update wallet balances
        await db
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${messageCost}`,
          })
          .where(eq(wallets.userId, senderId));

        await db
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${messageCost}`,
          })
          .where(eq(wallets.userId, receiverId));
      }
    }

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
    if (conversation) {

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
   * Limit to most recent 50 conversations for performance
   */
  static async getUserConversations(userId: string, limit: number = 50) {
    const allConversations = await db.query.conversations.findMany({
      where: or(
        eq(conversations.user1Id, userId),
        eq(conversations.user2Id, userId)
      ),
      orderBy: [desc(conversations.lastMessageAt)],
      limit, // Add limit for better performance
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
        ? conv.user1UnreadCount
        : conv.user2UnreadCount;
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
        paidAmount,
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

  /**
   * Send a locked/PPV message
   */
  static async sendLockedMessage(
    conversationId: string,
    senderId: string,
    content: string,
    unlockPrice: number,
    mediaUrl?: string,
    mediaType?: string,
    thumbnailUrl?: string
  ) {
    // Create locked message
    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content,
        messageType: 'locked',
        isLocked: true,
        unlockPrice,
        mediaUrl,
        mediaType,
        thumbnailUrl,
      })
      .returning();

    // Update conversation's last message
    await db
      .update(conversations)
      .set({
        lastMessageText: '🔒 Locked message',
        lastMessageAt: new Date(),
        lastMessageSenderId: senderId,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

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
   * Unlock a locked message
   */
  static async unlockMessage(userId: string, messageId: string) {
    // Get the message
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      with: {
        sender: {
          columns: {
            id: true,
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (!message.isLocked) {
      throw new Error('Message is not locked');
    }

    if (message.unlockedBy) {
      throw new Error('Message already unlocked');
    }

    if (!message.unlockPrice) {
      throw new Error('Message has no unlock price');
    }

    // Check if user has enough balance
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet || wallet.balance < message.unlockPrice) {
      throw new Error('Insufficient balance');
    }

    // Create transactions (double-entry)
    const idempotencyKey = uuidv4();

    // Deduct from buyer
    const [buyerTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId,
        amount: -message.unlockPrice,
        type: 'locked_message',
        status: 'completed',
        description: `Unlocked message from ${message.sender.displayName || message.sender.username}`,
        idempotencyKey,
      })
      .returning();

    // Credit to creator
    await db.insert(walletTransactions).values({
      userId: message.senderId,
      amount: message.unlockPrice,
      type: 'locked_message',
      status: 'completed',
      description: `Locked message unlocked by buyer`,
      relatedTransactionId: buyerTransaction.id,
    });

    // Update wallet balances
    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${message.unlockPrice}`,
      })
      .where(eq(wallets.userId, userId));

    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${message.unlockPrice}`,
      })
      .where(eq(wallets.userId, message.senderId));

    // Mark message as unlocked
    await db
      .update(messages)
      .set({
        unlockedBy: userId,
        unlockedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    return { success: true, message: 'Message unlocked successfully' };
  }

  /**
   * Send a tip in DM
   */
  static async sendTip(
    conversationId: string,
    senderId: string,
    receiverId: string,
    amount: number,
    tipMessage?: string
  ) {
    // Check if sender has enough balance
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, senderId),
    });

    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Create transactions (double-entry)
    const idempotencyKey = uuidv4();

    // Deduct from sender
    const [senderTransaction] = await db
      .insert(walletTransactions)
      .values({
        userId: senderId,
        amount: -amount,
        type: 'dm_tip',
        status: 'completed',
        description: tipMessage || 'Tip sent via DM',
        idempotencyKey,
      })
      .returning();

    // Credit to receiver
    await db.insert(walletTransactions).values({
      userId: receiverId,
      amount,
      type: 'dm_tip',
      status: 'completed',
      description: tipMessage || 'Tip received via DM',
      relatedTransactionId: senderTransaction.id,
    });

    // Update wallet balances
    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}`,
      })
      .where(eq(wallets.userId, senderId));

    await db
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} + ${amount}`,
      })
      .where(eq(wallets.userId, receiverId));

    // Create tip message
    const [message] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content: tipMessage || `Sent ${amount} coins`,
        messageType: 'tip',
        tipAmount: amount,
        tipTransactionId: senderTransaction.id,
      })
      .returning();

    // Update conversation's last message
    await db
      .update(conversations)
      .set({
        lastMessageText: `💰 Sent ${amount} coins`,
        lastMessageAt: new Date(),
        lastMessageSenderId: senderId,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

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
   * Check if a user is blocked
   */
  static async isUserBlocked(blockerId: string, blockedId: string) {
    const block = await db.query.blockedUsers.findFirst({
      where: and(
        eq(blockedUsers.blockerId, blockerId),
        eq(blockedUsers.blockedId, blockedId)
      ),
    });

    return !!block;
  }

  /**
   * Block a user
   */
  static async blockUser(blockerId: string, blockedId: string, reason?: string) {
    // Check if already blocked
    const existing = await this.isUserBlocked(blockerId, blockedId);
    if (existing) {
      throw new Error('User is already blocked');
    }

    await db.insert(blockedUsers).values({
      blockerId,
      blockedId,
      reason,
    });

    return { success: true, message: 'User blocked successfully' };
  }

  /**
   * Unblock a user
   */
  static async unblockUser(blockerId: string, blockedId: string) {
    await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.blockerId, blockerId),
          eq(blockedUsers.blockedId, blockedId)
        )
      );

    return { success: true, message: 'User unblocked successfully' };
  }

  /**
   * Get blocked users list
   */
  static async getBlockedUsers(userId: string) {
    const blocks = await db.query.blockedUsers.findMany({
      where: eq(blockedUsers.blockerId, userId),
      with: {
        blocked: {
          columns: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return blocks.map(block => ({
      ...block.blocked,
      blockedAt: block.createdAt,
      reason: block.reason,
    }));
  }
}
