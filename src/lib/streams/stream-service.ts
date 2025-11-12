import { db } from '@/lib/data/system';
import {
  streams,
  streamMessages,
  streamGifts,
  streamViewers,
  virtualGifts,
  users,
  wallets,
  walletTransactions,
} from '@/lib/data/system';
import { eq, desc, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { WalletService } from '../wallet/wallet-service';

/**
 * StreamService uses Drizzle ORM for complex streaming operations.
 * All routes using this service MUST export:
 *   export const runtime = 'nodejs';
 *   export const dynamic = 'force-dynamic';
 */

export class StreamService {
  /**
   * Create and start a new stream
   */
  static async createStream(
    creatorId: string,
    title: string,
    description?: string,
    category?: string,
    privacy?: string,
    thumbnailUrl?: string,
    scheduledAt?: Date
  ) {
    const roomName = `stream_${uuidv4()}`;
    const isScheduled = scheduledAt && scheduledAt > new Date();

    const [stream] = await db
      .insert(streams)
      .values({
        creatorId,
        title,
        description,
        category,
        privacy: privacy || 'public',
        thumbnailUrl,
        roomName,
        status: isScheduled ? 'scheduled' : 'live',
        scheduledFor: scheduledAt,
        startedAt: isScheduled ? undefined : new Date(),
      })
      .returning();

    return stream;
  }

  /**
   * End a stream and save stats (idempotent - safe to call multiple times)
   */
  static async endStream(streamId: string) {
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      throw new Error('Stream not found');
    }

    // Idempotent: If already ended, just return the stream
    if (stream.status !== 'live') {
      return stream;
    }

    const endTime = new Date();
    const startTime = stream.startedAt || new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const [updatedStream] = await db
      .update(streams)
      .set({
        status: 'ended',
        endedAt: endTime,
        durationSeconds,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId))
      .returning();

    // Clear all viewers
    await db.delete(streamViewers).where(eq(streamViewers.streamId, streamId));

    return updatedStream;
  }

  /**
   * Join a stream as a viewer
   */
  static async joinStream(streamId: string, userId: string, username: string) {
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      throw new Error('Stream not found');
    }

    if (stream.status !== 'live') {
      throw new Error('Stream is not live');
    }

    // Check if already viewing
    const existing = await db.query.streamViewers.findFirst({
      where: and(
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.userId, userId)
      ),
    });

    if (existing) {
      // Update last seen
      await db
        .update(streamViewers)
        .set({ lastSeenAt: new Date() })
        .where(eq(streamViewers.id, existing.id));

      return existing;
    }

    // Add new viewer
    const [viewer] = await db
      .insert(streamViewers)
      .values({
        streamId,
        userId,
        username,
      })
      .returning();

    // Update viewer counts
    await this.updateViewerCount(streamId);

    // Increment total views
    await db
      .update(streams)
      .set({
        totalViews: sql`${streams.totalViews} + 1`,
      })
      .where(eq(streams.id, streamId));

    return viewer;
  }

  /**
   * Leave a stream
   */
  static async leaveStream(streamId: string, userId: string) {
    await db.delete(streamViewers).where(
      and(
        eq(streamViewers.streamId, streamId),
        eq(streamViewers.userId, userId)
      )
    );

    await this.updateViewerCount(streamId);
  }

  /**
   * Update viewer count (call after join/leave)
   */
  static async updateViewerCount(streamId: string) {
    const viewers = await db.query.streamViewers.findMany({
      where: eq(streamViewers.streamId, streamId),
    });

    const currentCount = viewers.length;

    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) return;

    const peakViewers = Math.max(stream.peakViewers, currentCount);

    await db
      .update(streams)
      .set({
        currentViewers: currentCount,
        peakViewers,
        updatedAt: new Date(),
      })
      .where(eq(streams.id, streamId));

    return { currentViewers: currentCount, peakViewers };
  }

  /**
   * Send a chat message
   */
  static async sendMessage(
    streamId: string,
    userId: string,
    username: string,
    message: string
  ) {
    const [msg] = await db
      .insert(streamMessages)
      .values({
        streamId,
        userId,
        username,
        message,
        messageType: 'chat',
      })
      .returning();

    return msg;
  }

  /**
   * Send a virtual gift
   */
  static async sendGift(
    streamId: string,
    senderId: string,
    senderUsername: string,
    giftId: string,
    quantity: number = 1
  ) {
    // Get gift details
    const gift = await db.query.virtualGifts.findFirst({
      where: eq(virtualGifts.id, giftId),
    });

    if (!gift) {
      throw new Error('Gift not found');
    }

    const totalCoins = gift.coinCost * quantity;

    // Deduct coins from sender using wallet service
    await WalletService.createTransaction({
      userId: senderId,
      amount: -totalCoins,
      type: 'stream_tip',
      description: `Sent ${quantity}x ${gift.emoji} ${gift.name} to stream`,
      idempotencyKey: `gift_${uuidv4()}`,
    });

    // Record gift
    const [streamGift] = await db
      .insert(streamGifts)
      .values({
        streamId,
        senderId,
        giftId,
        quantity,
        totalCoins,
        senderUsername,
      })
      .returning();

    // Update stream total gifts
    await db
      .update(streams)
      .set({
        totalGiftsReceived: sql`${streams.totalGiftsReceived} + ${totalCoins}`,
      })
      .where(eq(streams.id, streamId));

    // Create gift system message
    await db.insert(streamMessages).values({
      streamId,
      userId: senderId,
      username: senderUsername,
      message: `sent ${quantity}x ${gift.emoji} ${gift.name}`,
      messageType: 'gift',
      giftId,
      giftAmount: totalCoins,
    });

    // Get stream creator and credit them
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (stream) {
      await WalletService.createTransaction({
        userId: stream.creatorId,
        amount: totalCoins,
        type: 'stream_tip',
        description: `Received ${quantity}x ${gift.emoji} ${gift.name} during stream`,
        idempotencyKey: `gift_receive_${streamGift.id}`,
      });
    }

    return { streamGift, gift };
  }

  /**
   * Get chat messages for a stream
   */
  static async getMessages(streamId: string, limit: number = 100) {
    return await db.query.streamMessages.findMany({
      where: eq(streamMessages.streamId, streamId),
      orderBy: [desc(streamMessages.createdAt)],
      limit,
      with: {
        user: {
          columns: {
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get gift leaderboard for a stream
   */
  static async getGiftLeaderboard(streamId: string, limit: number = 10) {
    const leaderboard = await db
      .select({
        senderUsername: streamGifts.senderUsername,
        senderId: streamGifts.senderId,
        totalCoins: sql<number>`SUM(${streamGifts.totalCoins})`,
      })
      .from(streamGifts)
      .where(eq(streamGifts.streamId, streamId))
      .groupBy(streamGifts.senderId, streamGifts.senderUsername)
      .orderBy(desc(sql`SUM(${streamGifts.totalCoins})`))
      .limit(limit);

    return leaderboard;
  }

  /**
   * Get current viewers
   */
  static async getCurrentViewers(streamId: string) {
    return await db.query.streamViewers.findMany({
      where: eq(streamViewers.streamId, streamId),
      orderBy: [desc(streamViewers.joinedAt)],
    });
  }

  /**
   * Get all live streams
   */
  static async getLiveStreams() {
    return await db.query.streams.findMany({
      where: eq(streams.status, 'live'),
      orderBy: [desc(streams.currentViewers), desc(streams.startedAt)],
      with: {
        creator: {
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
   * Get stream by ID
   */
  static async getStream(streamId: string) {
    return await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      with: {
        creator: {
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
   * Get creator's streams
   */
  static async getCreatorStreams(creatorId: string, limit: number = 20) {
    return await db.query.streams.findMany({
      where: eq(streams.creatorId, creatorId),
      orderBy: [desc(streams.createdAt)],
      limit,
    });
  }

  /**
   * Get all available gifts
   */
  static async getAllGifts() {
    return await db.query.virtualGifts.findMany({
      orderBy: [virtualGifts.coinCost],
    });
  }
}
