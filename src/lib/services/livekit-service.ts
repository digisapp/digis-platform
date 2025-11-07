import { AccessToken } from 'livekit-server-sdk';

export class LiveKitService {
  /**
   * Generate an access token for a user to join a video call room
   */
  static generateToken(roomName: string, participantName: string, participantId: string) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('LiveKit credentials not configured');
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantId,
      name: participantName,
    });

    // Grant permissions
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }
}
