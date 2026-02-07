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
  menuItemLabel?: string | null;
  itemCategory?: string | null;
  fulfillmentType?: string | null;
  message?: string | null;
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
  action: 'created' | 'updated' | 'completed' | 'deleted';
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

interface PollUpdateEvent {
  poll: any;
  action: 'created' | 'updated' | 'ended';
  timestamp: number;
}

interface CountdownUpdateEvent {
  countdown: any;
  action: 'created' | 'cancelled' | 'ended';
  timestamp: number;
}

// Guest call-in events
interface GuestRequestEvent {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestType: 'video' | 'voice';
  requestId: string;
}

interface GuestAcceptedEvent {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestType: 'video' | 'voice';
}

interface GuestRejectedEvent {
  userId: string;
  username: string;
}

interface GuestRequestExpiredEvent {
  requestId: string;
  userId: string;
  reason: string;
}

interface GuestJoinedEvent {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  requestType: 'video' | 'voice';
}

interface GuestRemovedEvent {
  userId: string;
  username: string | null;
}

interface GuestRequestsToggleEvent {
  enabled: boolean;
}

interface GuestInviteEvent {
  inviteId: string;
  viewerId: string;
  inviteType: 'video' | 'voice';
  host: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  streamTitle: string;
}

interface SlowModeChangeEvent {
  enabled: boolean;
  seconds: number;
  timestamp: number;
}

interface UseStreamChatOptions {
  streamId: string;
  isHost?: boolean; // If true, don't count this user in viewer count
  onMessage?: (message: ChatMessage) => void;
  onTip?: (tip: TipEvent) => void;
  onGift?: (gift: GiftEvent) => void;
  onReaction?: (reaction: ReactionEvent) => void;
  onViewerCount?: (count: { currentViewers: number; peakViewers: number }) => void;
  onViewerJoined?: () => void;
  onStreamEnded?: () => void;
  onGoalUpdate?: (update: GoalUpdate) => void;
  onSpotlightChanged?: (event: SpotlightChangedEvent) => void;
  onTicketedAnnouncement?: (event: TicketedAnnouncementEvent) => void;
  onVipModeChange?: (event: VipModeChangeEvent) => void;
  onMenuToggle?: (event: MenuToggleEvent) => void;
  onPollUpdate?: (event: PollUpdateEvent) => void;
  onCountdownUpdate?: (event: CountdownUpdateEvent) => void;
  // Guest call-in events
  onGuestRequest?: (event: GuestRequestEvent) => void;
  onGuestAccepted?: (event: GuestAcceptedEvent) => void;
  onGuestRejected?: (event: GuestRejectedEvent) => void;
  onGuestJoined?: (event: GuestJoinedEvent) => void;
  onGuestRemoved?: (event: GuestRemovedEvent) => void;
  onGuestRequestsToggle?: (event: GuestRequestsToggleEvent) => void;
  onGuestInvite?: (event: GuestInviteEvent) => void;
  onGuestRequestExpired?: (event: GuestRequestExpiredEvent) => void;
  onSlowModeChange?: (event: SlowModeChangeEvent) => void;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

interface UseStreamChatReturn {
  messages: ChatMessage[];
  viewerCount: number;
  isConnected: boolean;
  connectionState: ConnectionState;
  error: Error | null;
}

/**
 * React hook for stream chat using Ably
 * Handles chat messages, tips, gifts, reactions, and viewer count
 */
export function useStreamChat({
  streamId,
  isHost = false,
  onMessage,
  onTip,
  onGift,
  onReaction,
  onViewerCount,
  onViewerJoined,
  onStreamEnded,
  onGoalUpdate,
  onSpotlightChanged,
  onTicketedAnnouncement,
  onVipModeChange,
  onMenuToggle,
  onPollUpdate,
  onCountdownUpdate,
  onGuestRequest,
  onGuestAccepted,
  onGuestRejected,
  onGuestJoined,
  onGuestRemoved,
  onGuestRequestsToggle,
  onGuestInvite,
  onGuestRequestExpired,
  onSlowModeChange,
}: UseStreamChatOptions): UseStreamChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<Error | null>(null);

  // Use refs for callbacks to avoid stale closures
  const callbacksRef = useRef({
    onMessage,
    onTip,
    onGift,
    onReaction,
    onViewerCount,
    onViewerJoined,
    onStreamEnded,
    onGoalUpdate,
    onSpotlightChanged,
    onTicketedAnnouncement,
    onVipModeChange,
    onMenuToggle,
    onPollUpdate,
    onCountdownUpdate,
    onGuestRequest,
    onGuestAccepted,
    onGuestRejected,
    onGuestJoined,
    onGuestRemoved,
    onGuestRequestsToggle,
    onGuestInvite,
    onGuestRequestExpired,
    onSlowModeChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onTip,
      onGift,
      onReaction,
      onViewerCount,
      onViewerJoined,
      onStreamEnded,
      onGoalUpdate,
      onSpotlightChanged,
      onTicketedAnnouncement,
      onVipModeChange,
      onMenuToggle,
      onPollUpdate,
      onCountdownUpdate,
      onGuestRequest,
      onGuestAccepted,
      onGuestRejected,
      onGuestJoined,
      onGuestRemoved,
      onGuestRequestsToggle,
      onGuestInvite,
      onGuestRequestExpired,
      onSlowModeChange,
    };
  }, [onMessage, onTip, onGift, onReaction, onViewerCount, onViewerJoined, onStreamEnded, onGoalUpdate, onSpotlightChanged, onTicketedAnnouncement, onVipModeChange, onMenuToggle, onPollUpdate, onCountdownUpdate, onGuestRequest, onGuestAccepted, onGuestRejected, onGuestJoined, onGuestRemoved, onGuestRequestsToggle, onGuestInvite, onGuestRequestExpired, onSlowModeChange]);

  useEffect(() => {
    let mounted = true;
    let chatChannel: Ably.RealtimeChannel | null = null;
    let tipsChannel: Ably.RealtimeChannel | null = null;
    let presenceChannel: Ably.RealtimeChannel | null = null;
    let mainChannel: Ably.RealtimeChannel | null = null;

    // Store reference to the connection state handler for proper cleanup
    let connectionStateHandler: ((stateChange: Ably.ConnectionStateChange) => void) | null = null;

    const setupChannels = async () => {
      // Helper to attach a channel with a timeout
      const attachChannel = (ch: Ably.RealtimeChannel) =>
        ch.state !== 'attached'
          ? Promise.race([
              ch.attach(),
              new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Channel attach timeout')), 10000)),
            ])
          : Promise.resolve();

      try {
        const ably = getAblyClient();

        // Set up connection state listeners for reconnection handling
        const handleConnectionStateChange = (stateChange: Ably.ConnectionStateChange) => {
          if (!mounted) return;

          switch (stateChange.current) {
            case 'connected':
              setConnectionState('connected');
              setIsConnected(true);
              setError(null);
              break;
            case 'connecting':
              // Check if we were previously connected (reconnecting)
              if (stateChange.previous === 'disconnected' || stateChange.previous === 'suspended') {
                setConnectionState('reconnecting');
              } else {
                setConnectionState('connecting');
              }
              break;
            case 'disconnected':
              setConnectionState('disconnected');
              setIsConnected(false);
              break;
            case 'suspended':
              setConnectionState('disconnected');
              setIsConnected(false);
              break;
            case 'failed':
              setConnectionState('failed');
              setIsConnected(false);
              setError(new Error(stateChange.reason?.message || 'Connection failed'));
              break;
            case 'closed':
              setConnectionState('disconnected');
              setIsConnected(false);
              break;
          }
        };

        // Store handler reference for cleanup and subscribe to connection state changes
        connectionStateHandler = handleConnectionStateChange;
        ably.connection.on(handleConnectionStateChange);

        // Wait for connection
        if (ably.connection.state !== 'connected') {
          setConnectionState('connecting');
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
        setConnectionState('connected');

        // Subscribe to chat channel (messages, reactions, goals)
        chatChannel = ably.channels.get(`stream:${streamId}:chat`);
        await attachChannel(chatChannel);
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
        chatChannel.subscribe('poll_update', (message) => {
          console.log('[useStreamChat] Received poll_update:', message.data);
          callbacksRef.current.onPollUpdate?.(message.data as PollUpdateEvent);
        });
        chatChannel.subscribe('countdown_update', (message) => {
          console.log('[useStreamChat] Received countdown_update:', message.data);
          callbacksRef.current.onCountdownUpdate?.(message.data as CountdownUpdateEvent);
        });
        chatChannel.subscribe('slow-mode-change', (message) => {
          console.log('[useStreamChat] Received slow-mode-change:', message.data);
          callbacksRef.current.onSlowModeChange?.(message.data as SlowModeChangeEvent);
        });

        // Subscribe to tips channel (tips, gifts)
        tipsChannel = ably.channels.get(`stream:${streamId}:tips`);
        await attachChannel(tipsChannel);
        tipsChannel.subscribe('tip', (message) => {
          callbacksRef.current.onTip?.(message.data as TipEvent);
        });
        tipsChannel.subscribe('gift', (message) => {
          callbacksRef.current.onGift?.(message.data as GiftEvent);
        });

        // Subscribe to main stream channel (ticketed announcements, stream events, guest events)
        // Must match CHANNEL_NAMES.streamChat from server
        mainChannel = ably.channels.get(`stream:${streamId}:chat`);
        mainChannel.subscribe('ticketed-announcement', (message) => {
          callbacksRef.current.onTicketedAnnouncement?.(message.data as TicketedAnnouncementEvent);
        });
        mainChannel.subscribe('tip-menu-toggle', (message) => {
          callbacksRef.current.onMenuToggle?.(message.data as MenuToggleEvent);
        });
        mainChannel.subscribe('stream_ended', () => {
          callbacksRef.current.onStreamEnded?.();
        });
        // Guest call-in events
        mainChannel.subscribe('guest-request', (message) => {
          callbacksRef.current.onGuestRequest?.(message.data as GuestRequestEvent);
        });
        mainChannel.subscribe('guest-request-accepted', (message) => {
          callbacksRef.current.onGuestAccepted?.(message.data as GuestAcceptedEvent);
        });
        mainChannel.subscribe('guest-request-rejected', (message) => {
          callbacksRef.current.onGuestRejected?.(message.data as GuestRejectedEvent);
        });
        mainChannel.subscribe('guest-joined', (message) => {
          callbacksRef.current.onGuestJoined?.(message.data as GuestJoinedEvent);
        });
        mainChannel.subscribe('guest-removed', (message) => {
          callbacksRef.current.onGuestRemoved?.(message.data as GuestRemovedEvent);
        });
        mainChannel.subscribe('guest-requests-toggle', (message) => {
          callbacksRef.current.onGuestRequestsToggle?.(message.data as GuestRequestsToggleEvent);
        });
        mainChannel.subscribe('guest-invite', (message) => {
          console.log('[useStreamChat] Received guest-invite event:', message.data);
          callbacksRef.current.onGuestInvite?.(message.data as GuestInviteEvent);
        });
        mainChannel.subscribe('guest-request-expired', (message) => {
          console.log('[useStreamChat] Received guest-request-expired event:', message.data);
          callbacksRef.current.onGuestRequestExpired?.(message.data as GuestRequestExpiredEvent);
        });

        // Subscribe to presence channel (viewer count, stream ended)
        presenceChannel = ably.channels.get(`stream:${streamId}:presence`);
        await attachChannel(presenceChannel);
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

        // Subscribe to presence changes FIRST to avoid missing events
        presenceChannel.presence.subscribe('enter', () => {
          if (mounted) {
            setViewerCount((prev) => prev + 1);
            callbacksRef.current.onViewerJoined?.();
          }
        });
        presenceChannel.presence.subscribe('leave', () => {
          if (mounted) setViewerCount((prev) => Math.max(0, prev - 1));
        });

        // Get current members BEFORE entering to get accurate initial count
        const members = await presenceChannel.presence.get();
        if (mounted) {
          setViewerCount(members.length);
        }

        // Now enter presence (host shouldn't count as a viewer)
        if (!isHost) {
          await presenceChannel.presence.enter();
        }

      } catch (err) {
        console.error('[useStreamChat] Setup error:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsConnected(false);
          setConnectionState('failed');
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

      // Cleanup connection state listener - only remove our specific handler
      // Previously this used ably.connection.off() which removed ALL listeners
      try {
        if (connectionStateHandler) {
          const ably = getAblyClient();
          ably.connection.off(connectionStateHandler);
        }
      } catch {
        // Ignore if ably client not available
      }

      // Cleanup channels
      if (presenceChannel) {
        // Only leave presence if we entered it (non-host users)
        if (!isHost) {
          presenceChannel.presence.leave().catch(() => {});
        }
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
  }, [streamId, isHost]);

  return {
    messages,
    viewerCount,
    isConnected,
    connectionState,
    error,
  };
}
