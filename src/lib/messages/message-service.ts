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
  follows,
} from '@/lib/data/system';
import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  getCachedConversations,
  setCachedConversations,
  invalidateConversationsCacheForBoth,
  CachedConversation,
} from '@/lib/cache';
import { BlockService } from '@/lib/services/block-service';
import { NotificationService } from '@/lib/services/notification-service';

// Cold outreach fee - creators pay 50 coins to message fans they don't have a relationship with
const COLD_OUTREACH_FEE = 50;

export class MessageService {
  /**
   * Check if sender has a relationship with recipient
   * Relationship exists if recipient has: followed, subscribed, messaged first, been on call, or purchased content
   */
  static async hasRelationship(senderId: string, recipientId: string): Promise<boolean> {
    // Run all relationship checks in PARALLEL instead of sequential
    // This reduces 5 sequential queries to 1 parallel batch (~5x faster)
    const [
      existingConversation,
      hasSubscription,
      hasCall,
      hasPurchasedContent,
      isFollowing
    ] = await Promise.all([
      // Check if they already have a conversation
      db.query.conversations.findFirst({
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
        with: {
          messages: {
            limit: 1,
            orderBy: [messages.createdAt],
            columns: { senderId: true },
          },
        },
      }),
      // Check if recipient is subscribed to sender
      db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, recipientId),
          eq(subscriptions.creatorId, senderId),
          eq(subscriptions.status, 'active')
        ),
        columns: { id: true },
      }),
      // Check if recipient has had a call with sender
      db.query.calls.findFirst({
        where: and(
          eq(calls.fanId, recipientId),
          eq(calls.creatorId, senderId),
          eq(calls.status, 'completed')
        ),
        columns: { id: true },
      }),
      // Check if recipient has purchased sender's content
      db.query.contentPurchases.findFirst({
        where: and(
          eq(contentPurchases.userId, recipientId),
          sql`${contentPurchases.contentId} IN (SELECT id FROM content_items WHERE creator_id = ${senderId})`
        ),
        columns: { id: true },
      }),
      // Check if recipient follows the sender (fan follows creator)
      db.query.follows.findFirst({
        where: and(
          eq(follows.followerId, recipientId),
          eq(follows.followingId, senderId)
        ),
        columns: { id: true },
      }),
    ]);

    // Check conversation - if recipient messaged first
    if (existingConversation?.messages?.[0]?.senderId === recipientId) {
      return true;
    }

    // Any other relationship exists (subscription, call, purchase, or follow)
    return !!(hasSubscription || hasCall || hasPurchasedContent || isFollowing);
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
   * Uses database transaction to ensure atomicity of financial operations
   */
  static async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: string,
    replyToId?: string
  ) {
    // Get conversation to determine receiver (outside transaction for validation)
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

    // Check if either user is an admin - admins can chat for free
    const isAdminConversation =
      sender.role === 'admin' || sender.isAdmin ||
      receiver.role === 'admin' || receiver.isAdmin;

    // Check if either user has blocked the other (includes both DM blocks and global blocks)
    const [dmBlocked, globalBlocked] = await Promise.all([
      this.isUserBlocked(receiverId, senderId), // DM-specific block
      BlockService.isEitherBlocked(senderId, receiverId), // Global block
    ]);

    if (dmBlocked || globalBlocked) {
      throw new Error('Unable to send message to this user');
    }

    // Use transaction for all financial and message operations
    return await db.transaction(async (tx) => {
      // SECURITY: Check for first message INSIDE transaction to prevent race condition
      // where two concurrent messages could both be charged the cold outreach fee
      const existingMessages = await tx.query.messages.findFirst({
        where: eq(messages.conversationId, conversationId),
      });
      const isFirstMessage = !existingMessages;

      let messageCost = 0;

      // Skip all fees for admin conversations
      if (!isAdminConversation && isFirstMessage && sender.role === 'creator' && receiver.role !== 'creator') {
        // Sender is a creator, receiver is a fan - check if they have a relationship
        const hasRelationship = await MessageService.hasRelationship(senderId, receiverId);

        if (!hasRelationship) {
          // No relationship - charge cold outreach fee
          const senderWallet = await tx.query.wallets.findFirst({
            where: eq(wallets.userId, senderId),
          });

          if (!senderWallet || senderWallet.balance < COLD_OUTREACH_FEE) {
            throw new Error(`Insufficient balance. You need ${COLD_OUTREACH_FEE} coins to message users you don't have a relationship with.`);
          }

          // Charge the cold outreach fee (platform keeps 100%)
          // Deterministic idempotency key - cold outreach can only be charged once per conversation
          const coldOutreachKey = `cold_outreach_${conversationId}`;

          await tx.insert(walletTransactions).values({
            userId: senderId,
            amount: -COLD_OUTREACH_FEE,
            type: 'message_charge',
            status: 'completed',
            description: `Message unlock: ${receiver.displayName || receiver.username}`,
            idempotencyKey: coldOutreachKey,
          });

          // Update sender's wallet balance
          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} - ${COLD_OUTREACH_FEE}`,
            })
            .where(eq(wallets.userId, senderId));

          messageCost = COLD_OUTREACH_FEE; // Track total cost
        }
      }

      // Messaging cost logic:
      // - Creator → Fan: ALWAYS FREE (creators don't pay to message fans)
      // - Fan/Subscriber → Creator: Everyone pays the creator's message rate (min 5 coins)
      // - Creator → Creator: Sender pays the receiver's message rate (if set)
      // - Admin conversations: ALWAYS FREE (admins can chat with anyone for free)
      //
      // Only charge when the RECEIVER is a creator (fans can't charge for messages)
      // Note: This is for regular text messages only - locked/PPV messages still cost coins
      // Note: AI auto-responses are FREE - included in the message rate
      const receiverIsCreator = receiver.role === 'creator';
      const MIN_MESSAGE_RATE = 3; // Minimum 3 coins per message

      if (!isAdminConversation && receiverIsCreator) {
        // Get creator settings to check message rate
        const settings = await tx.query.creatorSettings.findFirst({
          where: eq(creatorSettings.userId, receiverId),
        });

        // Use creator's rate or minimum rate (3 coins)
        const effectiveRate = Math.max(settings?.messageRate || MIN_MESSAGE_RATE, MIN_MESSAGE_RATE);

        if (effectiveRate > 0) {
          // Everyone pays the message rate (subscribers and non-subscribers alike)
          messageCost = effectiveRate;

          // Check sender's balance
          const senderWallet = await tx.query.wallets.findFirst({
            where: eq(wallets.userId, senderId),
          });

          if (!senderWallet || senderWallet.balance < messageCost) {
            throw new Error(`Insufficient balance. This creator charges ${messageCost} coins per message.`);
          }

          // Process payment
          const transactionId = uuidv4();

          // Deduct from sender
          await tx.insert(walletTransactions).values({
            userId: senderId,
            amount: -messageCost,
            type: 'message_charge',
            status: 'completed',
            description: `Message to ${receiver.displayName || receiver.username}`,
            idempotencyKey: `${transactionId}-debit`,
          });

          // Credit to receiver (creator)
          await tx.insert(walletTransactions).values({
            userId: receiverId,
            amount: messageCost,
            type: 'message_earnings',
            status: 'completed',
            description: `Message from ${senderWallet ? 'fan' : 'user'}`,
            idempotencyKey: `${transactionId}-credit`,
          });

          // Update wallet balances
          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} - ${messageCost}`,
            })
            .where(eq(wallets.userId, senderId));

          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} + ${messageCost}`,
            })
            .where(eq(wallets.userId, receiverId));
        }
      }

      // Create message
      const [message] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId,
          content,
          mediaUrl,
          mediaType,
          replyToId,
        })
        .returning();

      // Update conversation's last message
      // Increment unread count for receiver
      const unreadCountField =
        conversation.user1Id === receiverId
          ? 'user1_unread_count'
          : 'user2_unread_count';

      await tx
        .update(conversations)
        .set({
          lastMessageText: content.substring(0, 100),
          lastMessageAt: new Date(),
          lastMessageSenderId: senderId,
          [unreadCountField]: sql`CAST(${conversations[unreadCountField as keyof typeof conversations]} AS INTEGER) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Return message with sender info and replyTo
      const messageWithSender = await tx.query.messages.findFirst({
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
          replyTo: {
            columns: {
              id: true,
              content: true,
              senderId: true,
              messageType: true,
              mediaUrl: true,
              mediaType: true,
            },
            with: {
              sender: {
                columns: {
                  id: true,
                  displayName: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      // Invalidate conversation list cache for both users
      await invalidateConversationsCacheForBoth(senderId, receiverId);

      return messageWithSender!;
    });
  }

  /**
   * Get messages for a conversation (DEPRECATED - use getMessagesCursor instead)
   * Requires userId to verify participation
   */
  static async getMessages(conversationId: string, userId: string, limit: number = 50, offset: number = 0) {
    // Verify user is a participant in this conversation using simple select
    const [conversation] = await db
      .select({ user1Id: conversations.user1Id, user2Id: conversations.user2Id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    // Fetch messages (simple query without joins)
    const messageRows = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        messageType: messages.messageType,
        content: messages.content,
        isRead: messages.isRead,
        readAt: messages.readAt,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        thumbnailUrl: messages.thumbnailUrl,
        isLocked: messages.isLocked,
        unlockPrice: messages.unlockPrice,
        unlockedBy: messages.unlockedBy,
        unlockedAt: messages.unlockedAt,
        tipAmount: messages.tipAmount,
        tipTransactionId: messages.tipTransactionId,
        isAiGenerated: messages.isAiGenerated,
        replyToId: messages.replyToId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    // Collect unique sender IDs
    const senderIds = [...new Set(messageRows.map(r => r.senderId))];

    // Fetch sender info in a separate query
    const senderMap = new Map<string, { displayName: string | null; username: string | null; avatarUrl: string | null; role: string | null }>();
    if (senderIds.length > 0) {
      const senders = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
        })
        .from(users)
        .where(inArray(users.id, senderIds));

      senders.forEach(s => senderMap.set(s.id, s));
    }

    // Transform to expected format with nested sender object
    return messageRows.map(row => {
      const sender = senderMap.get(row.senderId);
      return {
        id: row.id,
        conversationId: row.conversationId,
        senderId: row.senderId,
        messageType: row.messageType,
        content: row.content,
        isRead: row.isRead,
        readAt: row.readAt,
        mediaUrl: row.mediaUrl,
        mediaType: row.mediaType,
        thumbnailUrl: row.thumbnailUrl,
        isLocked: row.isLocked,
        unlockPrice: row.unlockPrice,
        unlockedBy: row.unlockedBy,
        unlockedAt: row.unlockedAt,
        tipAmount: row.tipAmount,
        tipTransactionId: row.tipTransactionId,
        isAiGenerated: row.isAiGenerated,
        replyToId: row.replyToId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        sender: sender ? {
          id: row.senderId,
          displayName: sender.displayName,
          username: sender.username,
          avatarUrl: sender.avatarUrl,
          role: sender.role,
        } : {
          id: row.senderId,
          displayName: null,
          username: null,
          avatarUrl: null,
          role: null,
        },
      };
    });
  }

  /**
   * Get messages with cursor-based pagination (recommended)
   * More efficient than offset pagination at scale
   *
   * @param conversationId - The conversation to get messages from
   * @param userId - The user requesting (for auth check)
   * @param limit - Number of messages to return
   * @param cursor - The createdAt timestamp to start from (exclusive)
   * @param direction - 'older' for messages before cursor, 'newer' for after
   */
  static async getMessagesCursor(
    conversationId: string,
    userId: string,
    limit: number = 50,
    cursor?: string,
    direction: 'older' | 'newer' = 'older'
  ) {
    let serviceStep = 'init';
    try {
      console.log('[MessageService.getMessagesCursor] Starting', { conversationId, userId, limit, cursor, direction });

      // Step 1: Verify user is a participant in this conversation using simple select
      serviceStep = 'verify-conversation';
      console.log('[MessageService.getMessagesCursor] Step 1: Verifying conversation');

      const [conversation] = await db
        .select({ user1Id: conversations.user1Id, user2Id: conversations.user2Id })
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      console.log('[MessageService.getMessagesCursor] Step 1 result:', { found: !!conversation });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
        throw new Error('Unauthorized: You are not a participant in this conversation');
      }

      // Step 2: Build where condition for messages query
      serviceStep = 'build-where-condition';
      console.log('[MessageService.getMessagesCursor] Step 2: Building where condition');

      let whereCondition;
      if (cursor) {
        const cursorDate = new Date(cursor);
        console.log('[MessageService.getMessagesCursor] Using cursor date:', cursorDate.toISOString());
        if (direction === 'older') {
          whereCondition = and(
            eq(messages.conversationId, conversationId),
            sql`${messages.createdAt} < ${cursorDate}`
          );
        } else {
          whereCondition = and(
            eq(messages.conversationId, conversationId),
            sql`${messages.createdAt} > ${cursorDate}`
          );
        }
      } else {
        console.log('[MessageService.getMessagesCursor] No cursor, fetching first page');
        whereCondition = eq(messages.conversationId, conversationId);
      }

      // Step 3: Fetch messages (simple query without joins)
      serviceStep = 'fetch-messages';
      console.log('[MessageService.getMessagesCursor] Step 3: Fetching messages');

      const messageRows = await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          messageType: messages.messageType,
          content: messages.content,
          isRead: messages.isRead,
          readAt: messages.readAt,
          mediaUrl: messages.mediaUrl,
          mediaType: messages.mediaType,
          thumbnailUrl: messages.thumbnailUrl,
          isLocked: messages.isLocked,
          unlockPrice: messages.unlockPrice,
          unlockedBy: messages.unlockedBy,
          unlockedAt: messages.unlockedAt,
          tipAmount: messages.tipAmount,
          tipTransactionId: messages.tipTransactionId,
          isAiGenerated: messages.isAiGenerated,
          replyToId: messages.replyToId,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
        })
        .from(messages)
        .where(whereCondition!)
        .orderBy(direction === 'older' ? desc(messages.createdAt) : messages.createdAt)
        .limit(limit + 1);

      console.log('[MessageService.getMessagesCursor] Step 3 result:', { rowCount: messageRows.length });

      // Check if there are more messages
      const hasMore = messageRows.length > limit;
      const rows = hasMore ? messageRows.slice(0, limit) : messageRows;

      // Step 4: Collect unique sender IDs and fetch sender info
      serviceStep = 'fetch-senders';
      const senderIds = [...new Set(rows.map(r => r.senderId))];
      console.log('[MessageService.getMessagesCursor] Step 4: Fetching senders', { senderCount: senderIds.length });

      // Fetch sender info in a separate query
      const senderMap = new Map<string, { displayName: string | null; username: string | null; avatarUrl: string | null; role: string | null }>();
      if (senderIds.length > 0) {
        const senders = await db
          .select({
            id: users.id,
            displayName: users.displayName,
            username: users.username,
            avatarUrl: users.avatarUrl,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.id, senderIds));

        console.log('[MessageService.getMessagesCursor] Step 4 result:', { sendersFound: senders.length });
        senders.forEach(s => senderMap.set(s.id, s));
      }

      // Transform to expected format with nested sender object
      const messageList = rows.map(row => {
        const sender = senderMap.get(row.senderId);
        return {
          id: row.id,
          conversationId: row.conversationId,
          senderId: row.senderId,
          messageType: row.messageType,
          content: row.content,
          isRead: row.isRead,
          readAt: row.readAt,
          mediaUrl: row.mediaUrl,
          mediaType: row.mediaType,
          thumbnailUrl: row.thumbnailUrl,
          isLocked: row.isLocked,
          unlockPrice: row.unlockPrice,
          unlockedBy: row.unlockedBy,
          unlockedAt: row.unlockedAt,
          tipAmount: row.tipAmount,
          tipTransactionId: row.tipTransactionId,
          isAiGenerated: row.isAiGenerated,
          replyToId: row.replyToId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          sender: sender ? {
            id: row.senderId,
            displayName: sender.displayName,
            username: sender.username,
            avatarUrl: sender.avatarUrl,
            role: sender.role,
          } : {
            id: row.senderId,
            displayName: null,
            username: null,
            avatarUrl: null,
            role: null,
          },
        };
      });

      // Get the next cursor (the createdAt of the last message)
      // Handle both Date objects and string timestamps (depending on fetch_types setting)
      const nextCursor = messageList.length > 0
        ? (() => {
            const lastCreatedAt = messageList[messageList.length - 1].createdAt;
            if (lastCreatedAt instanceof Date) {
              return lastCreatedAt.toISOString();
            }
            // If it's already a string, return as-is
            return typeof lastCreatedAt === 'string' ? lastCreatedAt : null;
          })()
        : null;

      return {
        messages: messageList,
        nextCursor,
        hasMore,
      };
    } catch (error: any) {
      console.error('[MessageService.getMessagesCursor] Error at step:', serviceStep, {
        conversationId,
        userId,
        cursor,
        direction,
        error: error?.message,
        errorCode: error?.code,
        stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
      });
      // Rethrow with additional context
      const enhancedError = new Error(`[${serviceStep}] ${error?.message || 'Unknown error'}`);
      (enhancedError as any).originalError = error;
      (enhancedError as any).step = serviceStep;
      throw enhancedError;
    }
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
    if (conversation.user1Id === userId) {
      await db
        .update(conversations)
        .set({ user1UnreadCount: 0 })
        .where(eq(conversations.id, conversationId));
    } else {
      await db
        .update(conversations)
        .set({ user2UnreadCount: 0 })
        .where(eq(conversations.id, conversationId));
    }
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

    // Collect all unique user IDs to fetch their creator settings
    const userIds = new Set<string>();
    allConversations.forEach(conv => {
      userIds.add(conv.user1Id);
      userIds.add(conv.user2Id);
    });

    // Fetch creator settings for all users in one query
    const userIdArray = Array.from(userIds);
    const userSettings = userIdArray.length > 0
      ? await db.query.creatorSettings.findMany({
          where: inArray(creatorSettings.userId, userIdArray)
        })
      : [];

    // Create a map of userId -> messageRate
    const messageRateMap = new Map<string, number>();
    userSettings.forEach(settings => {
      messageRateMap.set(settings.userId, settings.messageRate);
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

      // Add message charge from creator settings
      const messageCharge = otherUser ? messageRateMap.get(otherUser.id) || 0 : 0;

      return {
        ...conv,
        otherUser: otherUser ? {
          ...otherUser,
          messageCharge,
        } : otherUser,
        unreadCount,
        isArchived,
        isPinned,
      };
    });
  }

  /**
   * Get a single conversation by ID with the other user's details
   * This is more efficient than fetching all conversations and filtering
   */
  static async getConversationById(conversationId: string, userId: string) {
    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.user1Id, userId),
          eq(conversations.user2Id, userId)
        )
      ),
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
      },
    });

    if (!conv) {
      return null;
    }

    // Determine other user and get their message rate
    const isUser1 = conv.user1Id === userId;
    const otherUser = isUser1 ? conv.user2 : conv.user1;

    // Fetch message rate for the other user if they're a creator
    let messageCharge = 0;
    if (otherUser) {
      const settings = await db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, otherUser.id),
        columns: { messageRate: true },
      });
      messageCharge = settings?.messageRate || 0;
    }

    const unreadCount = isUser1 ? conv.user1UnreadCount : conv.user2UnreadCount;
    const isArchived = isUser1 ? conv.user1Archived : conv.user2Archived;
    const isPinned = isUser1 ? conv.user1Pinned : conv.user2Pinned;

    return {
      id: conv.id,
      otherUser: otherUser ? {
        ...otherUser,
        messageCharge,
      } : null,
      unreadCount,
      isArchived,
      isPinned,
      lastMessageAt: conv.lastMessageAt,
      lastMessageText: conv.lastMessageText,
    };
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
   * SECURITY: Verifies user is a participant before allowing archive
   */
  static async archiveConversation(conversationId: string, userId: string, archive: boolean) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // SECURITY: Verify user is a participant in this conversation
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
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
   * SECURITY: Verifies user is a participant before allowing pin
   */
  static async pinConversation(conversationId: string, userId: string, pin: boolean) {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // SECURITY: Verify user is a participant in this conversation
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
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
    // SECURITY: Verify sender is a participant in this conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

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
   * Uses database transaction to ensure atomicity of financial operations
   */
  static async unlockMessage(userId: string, messageId: string) {
    // Get the message with conversation to verify recipient
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
        conversation: {
          columns: {
            user1Id: true,
            user2Id: true,
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // SECURITY: Verify user is a participant and is the recipient (not sender)
    const conversation = message.conversation;
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = conversation.user1Id === userId || conversation.user2Id === userId;
    if (!isParticipant) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    // Sender cannot unlock their own locked message
    if (message.senderId === userId) {
      throw new Error('Cannot unlock your own message');
    }

    if (!message.isLocked) {
      throw new Error('Message is not locked');
    }

    if (message.unlockedBy) {
      throw new Error('Message already unlocked');
    }

    // Check if this is a free reveal (fan media blurred for creator safety)
    const isFreeReveal = !message.unlockPrice || message.unlockPrice === 0;

    if (isFreeReveal) {
      // Free reveal - just mark as viewed, no payment needed
      await db
        .update(messages)
        .set({
          unlockedBy: userId,
          unlockedAt: new Date(),
        })
        .where(eq(messages.id, messageId));

      return { success: true, message: 'Media revealed' };
    }

    // Use transaction for all financial operations (paid unlock)
    return await db.transaction(async (tx) => {
      // Check if user has enough balance
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet || wallet.balance < message.unlockPrice!) {
        throw new Error('Insufficient balance');
      }

      // Create transactions (double-entry)
      // Deterministic idempotency key - a message can only be unlocked once per user
      const idempotencyKey = `unlock_${userId}_${messageId}`;

      // Deduct from buyer
      const [buyerTransaction] = await tx
        .insert(walletTransactions)
        .values({
          userId,
          amount: -message.unlockPrice!,
          type: 'locked_message',
          status: 'completed',
          description: `Unlocked message from ${message.sender.displayName || message.sender.username}`,
          idempotencyKey,
        })
        .returning();

      // Credit to creator
      await tx.insert(walletTransactions).values({
        userId: message.senderId,
        amount: message.unlockPrice!,
        type: 'locked_message',
        status: 'completed',
        description: `Locked message unlocked by buyer`,
        relatedTransactionId: buyerTransaction.id,
      });

      // Update wallet balances
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${message.unlockPrice}`,
        })
        .where(eq(wallets.userId, userId));

      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${message.unlockPrice}`,
        })
        .where(eq(wallets.userId, message.senderId));

      // Mark message as unlocked
      await tx
        .update(messages)
        .set({
          unlockedBy: userId,
          unlockedAt: new Date(),
        })
        .where(eq(messages.id, messageId));

      return { success: true, message: 'Message unlocked successfully' };
    });
  }

  /**
   * Send a tip in DM
   * Uses database transaction to ensure atomicity of financial operations
   */
  static async sendTip(
    conversationId: string,
    senderId: string,
    receiverId: string,
    amount: number,
    tipMessage?: string,
    giftId?: string,
    giftEmoji?: string,
    giftName?: string
  ) {
    // SECURITY: Verify sender is a participant in this conversation
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user1Id !== senderId && conversation.user2Id !== senderId) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    // Get sender info for notification (before transaction)
    const sender = await db.query.users.findFirst({
      where: eq(users.id, senderId),
      columns: { displayName: true, username: true, avatarUrl: true },
    });

    // Use transaction for all financial and message operations
    const messageWithSender = await db.transaction(async (tx) => {
      // Check if sender has enough balance
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, senderId),
      });

      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Create transactions (double-entry)
      // Deterministic idempotency key with 1-second precision to prevent double-clicks
      const idempotencyKey = `dm_tip_${senderId}_${receiverId}_${amount}_${Math.floor(Date.now() / 1000)}`;

      // Deduct from sender
      const giftLabel = giftEmoji && giftName ? `${giftEmoji} ${giftName}` : null;
      const [senderTransaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: senderId,
          amount: -amount,
          type: 'dm_tip',
          status: 'completed',
          description: giftLabel
            ? `Sent ${giftLabel} via DM${tipMessage ? ': ' + tipMessage : ''}`
            : tipMessage || 'Gift sent via DM',
          idempotencyKey,
          metadata: JSON.stringify({
            giftId: giftId || null,
            giftEmoji: giftEmoji || null,
            giftName: giftName || null,
            message: tipMessage || null,
          }),
        })
        .returning();

      // Credit to receiver
      await tx.insert(walletTransactions).values({
        userId: receiverId,
        amount,
        type: 'dm_tip',
        status: 'completed',
        description: giftLabel
          ? `Received ${giftLabel} via DM${tipMessage ? ': ' + tipMessage : ''}`
          : tipMessage || 'Gift received via DM',
        relatedTransactionId: senderTransaction.id,
        idempotencyKey: `${idempotencyKey}_credit`,
        metadata: JSON.stringify({
          giftId: giftId || null,
          giftEmoji: giftEmoji || null,
          giftName: giftName || null,
          message: tipMessage || null,
        }),
      });

      // Update wallet balances
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amount}`,
        })
        .where(eq(wallets.userId, senderId));

      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${amount}`,
        })
        .where(eq(wallets.userId, receiverId));

      // Create tip message
      const messageContent = giftLabel
        ? `Sent ${giftLabel}${tipMessage ? ': ' + tipMessage : ''}`
        : tipMessage || `Sent ${amount} coins`;
      const [message] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId,
          content: messageContent,
          messageType: 'tip',
          tipAmount: amount,
          tipTransactionId: senderTransaction.id,
        })
        .returning();

      // Update conversation's last message
      const lastMessageText = giftLabel
        ? `${giftEmoji} Sent ${giftName}`
        : `Sent ${amount} coins`;
      await tx
        .update(conversations)
        .set({
          lastMessageText,
          lastMessageAt: new Date(),
          lastMessageSenderId: senderId,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Return message with sender info
      const result = await tx.query.messages.findFirst({
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

      return result!;
    });

    // Send notification to receiver (after transaction succeeds)
    const senderName = sender?.displayName || sender?.username || 'Someone';
    const giftLabel = giftEmoji && giftName ? `${giftEmoji} ${giftName}` : null;
    const notifTitle = giftLabel
      ? `${senderName} sent you ${giftName}!`
      : `${senderName} sent you ${amount} coins!`;
    const notifMessage = tipMessage
      ? `"${tipMessage}"`
      : giftLabel
        ? `${amount} coins`
        : 'Via direct message';

    NotificationService.sendNotification(
      receiverId,
      'tip',
      notifTitle,
      notifMessage,
      `/chats/${conversationId}`,
      sender?.avatarUrl || undefined,
      { amount, giftId, giftEmoji, giftName }
    ).catch(err => {
      console.error('[MessageService.sendTip] Notification failed:', err);
    });

    return messageWithSender;
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

  /**
   * Send an automatic message from creator to fan (no fees)
   * Used for system-triggered messages like menu purchase confirmations
   */
  static async sendAutoMessage(
    creatorId: string,
    fanId: string,
    content: string
  ) {
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(creatorId, fanId);

      // Create message directly (skip fee checks - this is system-triggered)
      const [message] = await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          senderId: creatorId,
          content,
          messageType: 'text',
        })
        .returning();

      // Update conversation's last message
      const unreadCountField =
        conversation.user1Id === fanId
          ? 'user1_unread_count'
          : 'user2_unread_count';

      await db
        .update(conversations)
        .set({
          lastMessageText: content.substring(0, 100),
          lastMessageAt: new Date(),
          lastMessageSenderId: creatorId,
          [unreadCountField]: sql`CAST(${conversations[unreadCountField as keyof typeof conversations]} AS INTEGER) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));

      // Invalidate cache for both users
      await invalidateConversationsCacheForBoth(creatorId, fanId);

      return message;
    } catch (error) {
      console.error('[MessageService.sendAutoMessage] Error:', error);
      // Don't throw - auto messages are non-critical
      return null;
    }
  }
}
