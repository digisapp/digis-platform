import { AccessToken } from 'livekit-server-sdk';

export class LiveKitTokenService {
  /**
   * Generate a LiveKit access token for a user
   */
  static generateToken(params: {
    roomName: string;
    participantName: string;
    participantId: string;
    metadata?: Record<string, any>;
  }) {
    const { roomName, participantName, participantId, metadata } = params;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit credentials not configured');
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    // Grant permissions
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }
}
