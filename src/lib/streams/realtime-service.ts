import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { StreamMessage, StreamGift, VirtualGift } from '@/db/schema';

export type StreamEvent = {
  type: 'chat' | 'gift' | 'viewer_joined' | 'viewer_left' | 'viewer_count' | 'stream_ended';
  data: any;
};

export type ChatMessageEvent = {
  type: 'chat';
  data: StreamMessage;
};

export type GiftEvent = {
  type: 'gift';
  data: {
    streamGift: StreamGift;
    gift: VirtualGift;
  };
};

export type ViewerEvent = {
  type: 'viewer_joined' | 'viewer_left';
  data: {
    username: string;
    userId: string;
  };
};

export type ViewerCountEvent = {
  type: 'viewer_count';
  data: {
    currentViewers: number;
    peakViewers: number;
  };
};

export type StreamEndedEvent = {
  type: 'stream_ended';
  data: {
    streamId: string;
  };
};

export class RealtimeService {
  private static channels = new Map<string, RealtimeChannel>();

  /**
   * Subscribe to a stream's real-time events
   */
  static subscribeToStream(
    streamId: string,
    onEvent: (event: StreamEvent) => void
  ): RealtimeChannel {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    // Check if already subscribed
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'chat' }, (payload) => {
        onEvent({ type: 'chat', data: payload.payload });
      })
      .on('broadcast', { event: 'gift' }, (payload) => {
        onEvent({ type: 'gift', data: payload.payload });
      })
      .on('broadcast', { event: 'viewer_joined' }, (payload) => {
        onEvent({ type: 'viewer_joined', data: payload.payload });
      })
      .on('broadcast', { event: 'viewer_left' }, (payload) => {
        onEvent({ type: 'viewer_left', data: payload.payload });
      })
      .on('broadcast', { event: 'viewer_count' }, (payload) => {
        onEvent({ type: 'viewer_count', data: payload.payload });
      })
      .on('broadcast', { event: 'stream_ended' }, (payload) => {
        onEvent({ type: 'stream_ended', data: payload.payload });
      })
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  /**
   * Unsubscribe from a stream
   */
  static async unsubscribeFromStream(streamId: string) {
    const channelName = `stream:${streamId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }

  /**
   * Broadcast a chat message
   */
  static async broadcastChatMessage(streamId: string, message: StreamMessage) {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'chat',
      payload: message,
    });
  }

  /**
   * Broadcast a gift event
   */
  static async broadcastGift(
    streamId: string,
    streamGift: StreamGift,
    gift: VirtualGift
  ) {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'gift',
      payload: { streamGift, gift },
    });
  }

  /**
   * Broadcast viewer joined
   */
  static async broadcastViewerJoined(
    streamId: string,
    userId: string,
    username: string
  ) {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'viewer_joined',
      payload: { userId, username },
    });
  }

  /**
   * Broadcast viewer left
   */
  static async broadcastViewerLeft(
    streamId: string,
    userId: string,
    username: string
  ) {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'viewer_left',
      payload: { userId, username },
    });
  }

  /**
   * Broadcast viewer count update
   */
  static async broadcastViewerCount(
    streamId: string,
    currentViewers: number,
    peakViewers: number
  ) {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'viewer_count',
      payload: { currentViewers, peakViewers },
    });
  }

  /**
   * Broadcast stream ended
   */
  static async broadcastStreamEnded(streamId: string) {
    const supabase = createClient();
    const channelName = `stream:${streamId}`;

    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'stream_ended',
      payload: { streamId },
    });
  }

  /**
   * Clean up all channels
   */
  static async cleanup() {
    const supabase = createClient();

    for (const [channelName, channel] of this.channels.entries()) {
      await channel.unsubscribe();
    }

    this.channels.clear();
  }
}
