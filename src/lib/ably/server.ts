import Ably from 'ably';

let ablyRest: Ably.Rest | null = null;

/**
 * Get Ably REST client for server-side publishing
 * Uses API key directly (secure, server-only)
 */
export function getAblyServer(): Ably.Rest {
  if (!ablyRest) {
    const apiKey = process.env.ABLY_API_KEY;

    if (!apiKey) {
      throw new Error('ABLY_API_KEY environment variable is required');
    }

    ablyRest = new Ably.Rest({ key: apiKey });
  }

  return ablyRest;
}

/**
 * Publish a message to an Ably channel from the server
 */
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: any
): Promise<void> {
  const ably = getAblyServer();
  const channel = ably.channels.get(channelName);
  await channel.publish(eventName, data);
}

/**
 * Channel naming conventions:
 * - stream:{streamId}:chat - Stream chat messages
 * - stream:{streamId}:tips - Tips and gifts
 * - stream:{streamId}:presence - Viewer count, joins/leaves
 * - call:{callId} - Call signaling
 * - user:{userId}:notifications - User notifications
 * - dm:{conversationId} - Direct message updates
 * - platform:live - Global channel for live stream notifications
 */
export const CHANNEL_NAMES = {
  streamChat: (streamId: string) => `stream:${streamId}:chat`,
  streamTips: (streamId: string) => `stream:${streamId}:tips`,
  streamPresence: (streamId: string) => `stream:${streamId}:presence`,
  call: (callId: string) => `call:${callId}`,
  userNotifications: (userId: string) => `user:${userId}:notifications`,
  dmConversation: (conversationId: string) => `dm:${conversationId}`,
  platformLive: 'platform:live',
};
