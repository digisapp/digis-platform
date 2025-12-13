'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  content: string;
  timestamp: number;
  isCreator?: boolean;
  isModerator?: boolean;
  messageType?: string;
}

interface TipEvent {
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string | null;
  amount: number;
}

interface GiftEvent {
  streamGift: {
    id: string;
    senderId: string;
    senderUsername: string;
    senderAvatarUrl?: string | null;
    quantity: number;
  };
  gift: {
    id: string;
    name: string;
    emoji: string;
    coinCost: number;
    rarity: string;
  };
}

interface ReactionEvent {
  id: string;
  emoji: string;
  userId: string;
  username: string;
  timestamp: number;
}

interface GoalUpdate {
  goal: any;
  action: 'created' | 'updated' | 'completed';
}

interface SpotlightChangedEvent {
  spotlightedCreator: {
    id: string;
    creatorId: string;
    displayName: string | null;
    username: string;
    avatarUrl: string | null;
    tipsReceived: number;
  } | null;
}

interface TicketedAnnouncementEvent {
  ticketedStreamId: string;
  title: string;
  ticketPrice: number;
  startsAt: string;
  minutesUntilStart: number;
}

interface MenuToggleEvent {
  enabled: boolean;
}

interface VipModeChangeEvent {
  isActive: boolean;
  showId: string | null;
  showTitle: string | null;
  ticketPrice: number | null;
  timestamp: number;
}

interface UseStreamChatOptions {
  streamId: string;
  onMessage?: (message: ChatMessage) => void;
  onTip?: (tip: TipEvent) => void;
  onGift?: (gift: GiftEvent) => void;
  onReaction?: (reaction: ReactionEvent) => void;
  onViewerCount?: (count: { currentViewers: number; peakViewers: number }) => void;
  onStreamEnded?: () => void;
  onGoalUpdate?: (update: GoalUpdate) => void;
  onSpotlightChanged?: (event: SpotlightChangedEvent) => void;
  onTicketedAnnouncement?: (event: TicketedAnnouncementEvent) => void;
  onVipModeChange?: (event: VipModeChangeEvent) => void;
  onMenuToggle?: (event: MenuToggleEvent) => void;
}

interface UseStreamChatReturn {
  messages: ChatMessage[];
  viewerCount: number;
  isConnected: boolean;
  error: Error | null;
}

/**
 * React hook for stream chat using Ably
 * Handles chat messages, tips, gifts, reactions, and viewer count
 */
export function useStreamChat({
  streamId,
  onMessage,
  onTip,
  onGift,
  onReaction,
  onViewerCount,
  onStreamEnded,
  onGoalUpdate,
  onSpotlightChanged,
  onTicketedAnnouncement,
  onVipModeChange,
  onMenuToggle,
}: UseStreamChatOptions): UseStreamChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for callbacks to avoid stale closures
  const callbacksRef = useRef({
    onMessage,
    onTip,
    onGift,
    onReaction,
    onViewerCount,
    onStreamEnded,
    onGoalUpdate,
    onSpotlightChanged,
    onTicketedAnnouncement,
    onVipModeChange,
    onMenuToggle,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onTip,
      onGift,
      onReaction,
      onViewerCount,
      onStreamEnded,
      onGoalUpdate,
      onSpotlightChanged,
      onTicketedAnnouncement,
      onVipModeChange,
      onMenuToggle,
    };
  }, [onMessage, onTip, onGift, onReaction, onViewerCount, onStreamEnded, onGoalUpdate, onSpotlightChanged, onTicketedAnnouncement, onVipModeChange, onMenuToggle]);

  useEffect(() => {
    let mounted = true;
    let chatChannel: Ably.RealtimeChannel | null = null;
    let tipsChannel: Ably.RealtimeChannel | null = null;
    let presenceChannel: Ably.RealtimeChannel | null = null;
    let mainChannel: Ably.RealtimeChannel | null = null;

    const setupChannels = async () => {
      try {
        const ably = getAblyClient();

        // Wait for connection
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            ably.connection.once('failed', () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            });
          });
        }

        if (!mounted) return;
        setIsConnected(true);

        // Subscribe to chat channel (messages, reactions, goals)
        chatChannel = ably.channels.get(`stream:${streamId}:chat`);
        chatChannel.subscribe('chat', (message) => {
          const chatMsg = message.data as ChatMessage;
          if (mounted) {
            setMessages((prev) => [...prev.slice(-99), chatMsg]); // Keep last 100
            callbacksRef.current.onMessage?.(chatMsg);
          }
        });
        chatChannel.subscribe('reaction', (message) => {
          callbacksRef.current.onReaction?.(message.data as ReactionEvent);
        });
        chatChannel.subscribe('goal_update', (message) => {
          callbacksRef.current.onGoalUpdate?.(message.data as GoalUpdate);
        });
        chatChannel.subscribe('spotlight-changed', (message) => {
          callbacksRef.current.onSpotlightChanged?.(message.data as SpotlightChangedEvent);
        });
        chatChannel.subscribe('vip_mode_change', (message) => {
          callbacksRef.current.onVipModeChange?.(message.data as VipModeChangeEvent);
        });

        // Subscribe to tips channel (tips, gifts)
        tipsChannel = ably.channels.get(`stream:${streamId}:tips`);
        tipsChannel.subscribe('tip', (message) => {
          callbacksRef.current.onTip?.(message.data as TipEvent);
        });
        tipsChannel.subscribe('gift', (message) => {
          callbacksRef.current.onGift?.(message.data as GiftEvent);
        });

        // Subscribe to main stream channel (ticketed announcements, stream events)
        mainChannel = ably.channels.get(`stream:${streamId}`);
        mainChannel.subscribe('ticketed-announcement', (message) => {
          callbacksRef.current.onTicketedAnnouncement?.(message.data as TicketedAnnouncementEvent);
        });
        mainChannel.subscribe('tip-menu-toggle', (message) => {
          callbacksRef.current.onMenuToggle?.(message.data as MenuToggleEvent);
        });
        mainChannel.subscribe('stream_ended', () => {
          callbacksRef.current.onStreamEnded?.();
        });

        // Subscribe to presence channel (viewer count, stream ended)
        presenceChannel = ably.channels.get(`stream:${streamId}:presence`);
        presenceChannel.subscribe('viewer_count', (message) => {
          const data = message.data as { currentViewers: number; peakViewers: number };
          if (mounted) {
            setViewerCount(data.currentViewers);
            callbacksRef.current.onViewerCount?.(data);
          }
        });
        presenceChannel.subscribe('stream_ended', () => {
          callbacksRef.current.onStreamEnded?.();
        });

        // Use presence for accurate viewer count
        await presenceChannel.presence.enter();
        const members = await presenceChannel.presence.get();
        if (mounted) {
          setViewerCount(members.length);
        }

        // Subscribe to presence changes
        presenceChannel.presence.subscribe('enter', () => {
          if (mounted) setViewerCount((prev) => prev + 1);
        });
        presenceChannel.presence.subscribe('leave', () => {
          if (mounted) setViewerCount((prev) => Math.max(0, prev - 1));
        });

      } catch (err) {
        console.error('[useStreamChat] Setup error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsConnected(false);
        }
      }
    };

    setupChannels();

    return () => {
      mounted = false;

      // Helper to safely detach a channel only if it's attached
      // This prevents "Attach request superseded by subsequent detach request" errors
      const safeDetach = (channel: Ably.RealtimeChannel | null) => {
        if (channel && channel.state === 'attached') {
          channel.detach().catch(() => {});
        }
      };

      // Cleanup channels
      if (presenceChannel) {
        presenceChannel.presence.leave().catch(() => {});
        presenceChannel.unsubscribe();
        safeDetach(presenceChannel);
      }
      if (chatChannel) {
        chatChannel.unsubscribe();
        safeDetach(chatChannel);
      }
      if (tipsChannel) {
        tipsChannel.unsubscribe();
        safeDetach(tipsChannel);
      }
      if (mainChannel) {
        mainChannel.unsubscribe();
        safeDetach(mainChannel);
      }
    };
  }, [streamId]);

  return {
    messages,
    viewerCount,
    isConnected,
    error,
  };
}
