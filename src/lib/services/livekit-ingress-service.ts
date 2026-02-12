import { IngressClient } from 'livekit-server-sdk';
import { IngressInput } from '@livekit/protocol';

/**
 * LiveKit Ingress Service
 * Handles RTMP ingress for OBS/Streamlabs streaming support.
 * Creates an RTMP endpoint that LiveKit transcodes to WebRTC for viewers.
 */
export class LiveKitIngressService {
  private static getClient(): IngressClient {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error('LiveKit credentials not configured');
    }

    // Convert wss:// to https:// for API calls
    const apiUrl = livekitUrl.replace('wss://', 'https://');

    return new IngressClient(apiUrl, apiKey, apiSecret);
  }

  /**
   * Create an RTMP ingress for a room.
   * Returns the RTMP URL and stream key that the creator enters in OBS.
   */
  static async createRtmpIngress(
    roomName: string,
    participantIdentity: string,
    participantName: string
  ): Promise<{
    ingressId: string;
    url: string;
    streamKey: string;
  }> {
    const client = this.getClient();

    try {
      const info = await client.createIngress(IngressInput.RTMP_INPUT, {
        name: `rtmp-${roomName}`,
        roomName,
        participantIdentity,
        participantName,
        enableTranscoding: true,
      });

      console.log(`[Ingress] Created RTMP ingress for room ${roomName}, id: ${info.ingressId}`);

      return {
        ingressId: info.ingressId,
        url: info.url,
        streamKey: info.streamKey,
      };
    } catch (err) {
      console.error('[Ingress] Failed to create RTMP ingress:', err);
      throw err;
    }
  }

  /**
   * Get ingress info by ID
   */
  static async getIngressInfo(ingressId: string) {
    const client = this.getClient();

    try {
      const ingresses = await client.listIngress({ ingressId });
      return ingresses[0] || null;
    } catch (err) {
      console.error('[Ingress] Failed to get ingress info:', err);
      throw err;
    }
  }

  /**
   * Delete an ingress
   */
  static async deleteIngress(ingressId: string): Promise<void> {
    const client = this.getClient();

    try {
      await client.deleteIngress(ingressId);
      console.log(`[Ingress] Deleted ingress ${ingressId}`);
    } catch (err) {
      console.error('[Ingress] Failed to delete ingress:', err);
      throw err;
    }
  }

  /**
   * List all ingresses for a room
   */
  static async listRoomIngresses(roomName: string) {
    const client = this.getClient();

    try {
      return await client.listIngress({ roomName });
    } catch (err) {
      console.error('[Ingress] Failed to list ingresses:', err);
      throw err;
    }
  }
}
