import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

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

  /**
   * Delete a LiveKit room to free server resources.
   * Called after room_finished webhook to ensure cleanup.
   * Safe to call even if room is already gone (no-op).
   */
  static async deleteRoom(roomName: string): Promise<void> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.warn('[LiveKitService] Cannot delete room - missing credentials or URL');
      return;
    }

    try {
      const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
      await roomService.deleteRoom(roomName);
      console.log(`[LiveKitService] Deleted room: ${roomName}`);
    } catch (error) {
      // Room may already be gone — log but don't throw
      console.warn(`[LiveKitService] Failed to delete room ${roomName}:`, error);
    }
  }
}
