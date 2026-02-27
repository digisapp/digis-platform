import { EgressClient } from 'livekit-server-sdk';
import { EncodedFileType, S3Upload, EncodedFileOutput } from '@livekit/protocol';

/**
 * LiveKit Egress Service
 * Handles recording streams for VOD storage
 *
 * Note: LiveKit Egress records to S3-compatible storage.
 * We use Supabase Storage which is S3-compatible.
 */
export class LiveKitEgressService {
  private static getClient(): EgressClient {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error('LiveKit credentials not configured');
    }

    // Convert wss:// to https:// for API calls
    const apiUrl = livekitUrl.replace('wss://', 'https://');

    return new EgressClient(apiUrl, apiKey, apiSecret);
  }

  /**
   * Start recording a room
   * Records to Supabase Storage (S3-compatible)
   * If creatorUsername is provided, uses a custom egress layout with Digis watermark
   */
  static async startRecording(roomName: string, streamId: string, creatorUsername?: string): Promise<string> {
    const client = this.getClient();

    // Supabase Storage S3 credentials (need to be set in env)
    const s3AccessKey = process.env.SUPABASE_S3_ACCESS_KEY;
    const s3SecretKey = process.env.SUPABASE_S3_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!s3AccessKey || !s3SecretKey || !supabaseUrl) {
      console.warn('[Egress] S3 credentials not configured - recording disabled');
      throw new Error('Recording not configured. Missing S3 credentials.');
    }

    // Extract project ref from Supabase URL
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    const s3Endpoint = `https://${projectRef}.supabase.co/storage/v1/s3`;
    const bucketName = 'stream-recordings';

    // Generate filename
    const timestamp = Date.now();
    const filename = `${streamId}/${timestamp}.mp4`;

    // Configure S3 upload for Supabase Storage using protobuf Message class
    const s3Upload = new S3Upload({
      accessKey: s3AccessKey,
      secret: s3SecretKey,
      bucket: bucketName,
      region: 'auto', // Supabase doesn't require region
      endpoint: s3Endpoint,
      forcePathStyle: true, // Required for Supabase S3
    });

    // Create encoded file output with S3 destination
    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: filename,
      output: {
        case: 's3',
        value: s3Upload,
      },
    });

    try {
      // Build custom layout URL with watermark if creator username available
      const appUrl = process.env.NEXT_PUBLIC_URL || 'https://digis.cc';
      const customBaseUrl = creatorUsername
        ? `${appUrl}/egress-layout?username=${encodeURIComponent(creatorUsername)}`
        : undefined;

      // Start recording with file output to S3
      const info = await client.startRoomCompositeEgress(
        roomName,
        fileOutput,
        {
          layout: 'speaker',
          ...(customBaseUrl && { customBaseUrl }),
        }
      );

      console.log(`[Egress] Started recording for room ${roomName}, egress ID: ${info.egressId}`);
      return info.egressId;
    } catch (err) {
      console.error('[Egress] Failed to start recording:', err);
      throw err;
    }
  }

  /**
   * Stop an active recording
   */
  static async stopRecording(egressId: string): Promise<{ fileUrl: string } | null> {
    const client = this.getClient();

    try {
      const info = await client.stopEgress(egressId);
      console.log(`[Egress] Stopped recording, egress ID: ${egressId}`);

      // Extract the file URL from the result
      if (info.fileResults && info.fileResults.length > 0) {
        const fileResult = info.fileResults[0];
        return { fileUrl: fileResult.location || '' };
      }

      return null;
    } catch (err) {
      console.error('[Egress] Failed to stop recording:', err);
      throw err;
    }
  }

  /**
   * Get the status of an egress
   */
  static async getEgressInfo(egressId: string) {
    const client = this.getClient();

    try {
      const egresses = await client.listEgress({ egressId });
      return egresses[0] || null;
    } catch (err) {
      console.error('[Egress] Failed to get egress status:', err);
      throw err;
    }
  }

  /**
   * List active egresses for a room
   */
  static async listRoomEgresses(roomName: string) {
    const client = this.getClient();

    try {
      return await client.listEgress({ roomName });
    } catch (err) {
      console.error('[Egress] Failed to list egresses:', err);
      throw err;
    }
  }

  /**
   * Get the public URL for a recorded file
   */
  static getPublicUrl(filepath: string): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucketName = 'stream-recordings';
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filepath}`;
  }
}
