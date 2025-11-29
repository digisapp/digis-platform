import { publishToChannel, CHANNEL_NAMES } from '@/lib/ably/server';
import type { StreamMessage, StreamGift, VirtualGift } from '@/db/schema';

/**
 * Ably-based realtime service for streams
 * Replaces Supabase Realtime for better scalability (50k+ concurrent users)
 */
export class AblyRealtimeService {
  /**
   * Broadcast a chat message
   */
  static async broadcastChatMessage(streamId: string, message: StreamMessage) {
    await publishToChannel(
      CHANNEL_NAMES.streamChat(streamId),
      'chat',
      message
    );
  }

  /**
   * Broadcast a gift event
   */
  static async broadcastGift(
    streamId: string,
    streamGift: StreamGift & { senderAvatarUrl?: string | null },
    gift: VirtualGift
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamTips(streamId),
      'gift',
      { streamGift, gift }
    );
  }

  /**
   * Broadcast coin tip (without virtual gift)
   */
  static async broadcastTip(
    streamId: string,
    tipData: {
      senderId: string;
      senderUsername: string;
      senderAvatarUrl?: string | null;
      amount: number;
    }
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamTips(streamId),
      'tip',
      tipData
    );
  }

  /**
   * Broadcast viewer joined
   */
  static async broadcastViewerJoined(
    streamId: string,
    userId: string,
    username: string
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamPresence(streamId),
      'viewer_joined',
      { userId, username }
    );
  }

  /**
   * Broadcast viewer left
   */
  static async broadcastViewerLeft(
    streamId: string,
    userId: string,
    username: string
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamPresence(streamId),
      'viewer_left',
      { userId, username }
    );
  }

  /**
   * Broadcast viewer count update
   */
  static async broadcastViewerCount(
    streamId: string,
    currentViewers: number,
    peakViewers: number
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamPresence(streamId),
      'viewer_count',
      { currentViewers, peakViewers }
    );
  }

  /**
   * Broadcast stream ended
   */
  static async broadcastStreamEnded(streamId: string) {
    await publishToChannel(
      CHANNEL_NAMES.streamPresence(streamId),
      'stream_ended',
      { streamId }
    );
  }

  /**
   * Broadcast emoji reaction
   */
  static async broadcastReaction(
    streamId: string,
    emoji: string,
    userId: string,
    username: string
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamChat(streamId),
      'reaction',
      {
        id: `${userId}-${Date.now()}`,
        emoji,
        userId,
        username,
        timestamp: Date.now(),
      }
    );
  }

  /**
   * Broadcast a notification to a specific user
   */
  static async broadcastNotification(userId: string, notification: any) {
    await publishToChannel(
      CHANNEL_NAMES.userNotifications(userId),
      'notification',
      notification
    );
  }

  /**
   * Broadcast goal update (created, updated, completed)
   */
  static async broadcastGoalUpdate(
    streamId: string,
    goal: any,
    action: 'created' | 'updated' | 'completed'
  ) {
    await publishToChannel(
      CHANNEL_NAMES.streamChat(streamId),
      'goal_update',
      { goal, action }
    );
  }

  /**
   * Broadcast call request to creator
   */
  static async broadcastCallRequest(creatorId: string, callData: any) {
    await publishToChannel(
      CHANNEL_NAMES.userNotifications(creatorId),
      'call_request',
      callData
    );
  }

  /**
   * Broadcast call status update
   */
  static async broadcastCallUpdate(callId: string, status: string, data: any) {
    await publishToChannel(
      CHANNEL_NAMES.call(callId),
      status,
      data
    );
  }
}
