import { AccessToken } from 'livekit-server-sdk';

// Default TTL: 4.5 hours (covers max 4hr call + 30min buffer)
const DEFAULT_TOKEN_TTL_SECONDS = 4.5 * 60 * 60;

export class LiveKitService {
  /**
   * Generate an access token for a user to join a video call room
   * @param ttlSeconds Token time-to-live in seconds (default: 4.5 hours)
   */
  static async generateToken(
    roomName: string,
    participantName: string,
    participantId: string,
    ttlSeconds: number = DEFAULT_TOKEN_TTL_SECONDS,
  ): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit credentials not configured');
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName,
      ttl: ttlSeconds,
    });

    // Grant permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return await token.toJwt();
  }
}
