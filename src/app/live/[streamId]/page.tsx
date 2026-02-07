'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { streamAnalytics } from '@/lib/utils/analytics';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Volume2, VolumeX, Maximize, Minimize, Users,
  Ticket, Coins, List,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import { FloatingGiftBar } from '@/components/streaming/FloatingGiftBar';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { BRBOverlay } from '@/components/live/BRBOverlay';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { StreamPoll } from '@/components/streaming/StreamPoll';
import { StreamCountdown } from '@/components/streaming/StreamCountdown';
import { GuestVideoOverlay } from '@/components/streaming/GuestVideoOverlay';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useStreamClipper } from '@/hooks/useStreamClipper';
import { useGoalCelebrations } from '@/hooks/useGoalCelebrations';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { useWaitingRoomMusic } from '@/hooks/useWaitingRoomMusic';
import { useTicketCountdown } from '@/hooks/useTicketCountdown';
import { useViewerKeyboardShortcuts } from '@/hooks/useViewerKeyboardShortcuts';
import { useBRBDetection } from '@/hooks/useBRBDetection';
import { useViewerData } from '@/hooks/useViewerData';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import { TipModal } from '@/components/streaming/TipModal';
import { MenuModal } from '@/components/streaming/MenuModal';
import { StreamErrorBoundary } from '@/components/error-boundaries';
import { useToastContext } from '@/context/ToastContext';
import { getCategoryById, getCategoryIcon } from '@/lib/constants/stream-categories';
import { useTicketPurchaseFlow } from '@/hooks/useTicketPurchaseFlow';
import { AccessDeniedScreen } from '@/components/streaming/AccessDeniedScreen';
import { TicketedStreamBlockScreen } from '@/components/streaming/TicketedStreamBlockScreen';
import { StreamHeaderBar } from '@/components/streaming/StreamHeaderBar';
import {
  StreamEndedOverlay,
  TicketAnnouncementModal,
  QuickBuyTicketModal,
  DigitalDownloadModal,
  ViewerListPanel,
  PinnedMenuPreview,
  ViewerChatMessages,
  ViewerChatInput,
} from '@/components/streaming/viewer';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  timestamp: number;
  isCreator?: boolean;
  isModerator?: boolean;
  messageType?: 'chat' | 'tip' | 'gift' | 'ticket_purchase' | 'menu_purchase' | 'menu_order' | 'menu_tip';
  tipAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftQuantity?: number;
  ticketPrice?: number;
  showTitle?: string;
}

// Component to render the remote video from broadcaster
function ViewerVideo({ onBroadcasterLeft }: { onBroadcasterLeft?: () => void }) {
  const participants = useRemoteParticipants();
  const broadcaster = participants[0]; // First participant is the broadcaster
  const prevBroadcasterRef = React.useRef(broadcaster);

  // Detect when broadcaster leaves (stream ended)
  React.useEffect(() => {
    if (prevBroadcasterRef.current && !broadcaster) {
      // Broadcaster was there but now gone - stream ended
      onBroadcasterLeft?.();
    }
    prevBroadcasterRef.current = broadcaster;
  }, [broadcaster, onBroadcasterLeft]);

  if (!broadcaster) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  const videoPublication = broadcaster.videoTrackPublications.values().next().value;

  if (!videoPublication || !videoPublication.track) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Waiting for video...</p>
        </div>
      </div>
    );
  }

  // Always use object-cover to fill the container (like video calls)
  // This crops the landscape video to fit portrait containers
  return (
    <VideoTrack
      trackRef={{ participant: broadcaster, publication: videoPublication, source: videoPublication.source }}
      className="w-full h-full object-cover"
    />
  );
}

export default function TheaterModePage() {
  const params = useParams();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToastContext();
  const streamId = params.streamId as string;

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showViewerList, setShowViewerList] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const { celebratingGoal, completedGoalsQueue, addCompletedGoal } = useGoalCelebrations();

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [showBRB, setShowBRB] = useState(false);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);

  // Chat state
  const MAX_CHAT_MESSAGES = 200;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Memoized reversed message list for performance
  const displayMessages = useMemo(() => {
    return [...messages].slice(-50).reverse();
  }, [messages]);

  // Floating gift emojis state
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>>([]);

  // User state (shared between useViewerData and useTicketPurchaseFlow)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);

  // Ticket purchase flow (ticketed streams, announcements, quick buy)
  const {
    ticketedModeActive, setTicketedModeActive,
    hasTicket, setHasTicket,
    ticketedShowInfo, setTicketedShowInfo,
    purchasingTicket,
    showQuickBuyModal, setShowQuickBuyModal,
    quickBuyInfo, setQuickBuyInfo,
    quickBuyLoading,
    hasPurchasedUpcomingTicket, setHasPurchasedUpcomingTicket,
    showTicketPurchaseSuccess,
    ticketedAnnouncement, setTicketedAnnouncement,
    dismissedTicketedStream, setDismissedTicketedStream,
    upcomingTicketedShow, setUpcomingTicketedShow,
    checkTicketAccess,
    abortPendingTicketCheck,
    handleInstantTicketPurchase,
    handleQuickBuyTicket,
  } = useTicketPurchaseFlow({
    streamId,
    currentUser,
    userBalance,
    setUserBalance,
    showError,
    setShowBuyCoinsModal: (show: boolean) => setShowBuyCoinsModal(show),
    routerPush: (path: string) => router.push(path),
  });

  // Consolidated data fetching (stream, token, polls, countdowns, guests, viewers, menu)
  const {
    stream, setStream,
    loading, setLoading,
    error,
    accessDenied, setAccessDenied,
    token, serverUrl,
    streamOrientation,
    menuItems, setMenuItems,
    menuEnabled, setMenuEnabled,
    activePoll, setActivePoll,
    activeCountdown, setActiveCountdown,
    activeGuest, setActiveGuest,
    viewers, leaderboard,
    loadStream, loadCurrentUser, fetchPoll, fetchCountdown,
  } = useViewerData({
    streamId,
    showViewerList,
    dismissedTicketedStream,
    ticketedAnnouncement,
    setUpcomingTicketedShow,
    setCurrentUser,
    setUserBalance,
  });

  // Digital download confirmation state
  const [digitalDownload, setDigitalDownload] = useState<{
    show: boolean;
    url: string;
    itemLabel: string;
    amount: number;
  } | null>(null);

  // Countdown timer for ticketed stream (computed from startsAt)
  const ticketCountdown = useTicketCountdown(upcomingTicketedShow?.startsAt || dismissedTicketedStream?.startsAt || null);

  // Remove completed floating gift
  const removeFloatingGift = useCallback((id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
  }, []);

  // Memoize watermark config for clip branding (Digis logo + creator URL)
  const clipWatermark = useMemo(() =>
    stream?.creator.username
      ? { logoUrl: '/images/digis-logo-white.png', creatorUsername: stream.creator.username }
      : undefined,
    [stream?.creator.username]
  );

  // Stream clipping hook (rolling 30-second buffer for viewers)
  const {
    bufferSeconds: clipBufferSeconds,
    isClipping: clipIsClipping,
    setIsClipping: setClipIsClipping,
    canClip,
    isSupported: clipIsSupported,
    clipCooldownRemaining,
    clipIt,
  } = useStreamClipper({
    bufferDurationSeconds: 30,
    watermark: clipWatermark,
    onError: (error) => showError(error),
  });

  const handleCreateClip = useCallback(async () => {
    if (!currentUser) {
      showInfo('Sign in to create clips');
      router.push(`/login?redirect=/live/${streamId}`);
      return;
    }

    const blob = await clipIt();
    if (!blob) return;

    setClipIsClipping(true);
    try {
      const formData = new FormData();
      formData.append('video', blob, `clip-${Date.now()}.webm`);
      formData.append('title', `Live Clip - ${stream?.title || 'Stream'}`);
      formData.append('streamId', streamId);
      formData.append('duration', String(Math.min(clipBufferSeconds, 30)));

      const response = await fetch('/api/clips/live', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create clip');
      }

      // Trigger instant download of the clip from the in-memory blob
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = (stream?.title || 'clip').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      a.download = `${safeName}-clip.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showSuccess('Clipped & saved!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create clip');
    } finally {
      setClipIsClipping(false);
    }
  }, [currentUser, clipIt, clipBufferSeconds, streamId, stream?.title, showSuccess, showError, showInfo, router, setClipIsClipping]);

  // Real-time stream updates via Ably
  const { viewerCount: realtimeViewerCount } = useStreamChat({
    streamId,
    onMessage: (message) => {
      // Transform the received message to match ChatMessage type
      // The Ably message may have 'message' field instead of 'content'
      const msgData = message as any;
      const chatMessage: ChatMessage = {
        id: msgData.id,
        userId: msgData.userId,
        username: msgData.username,
        displayName: msgData.displayName || msgData.username,
        avatarUrl: msgData.avatarUrl || msgData.user?.avatarUrl || null,
        content: msgData.content || msgData.message || '', // Handle both field names
        timestamp: msgData.timestamp || (msgData.createdAt ? new Date(msgData.createdAt).getTime() : Date.now()),
        isCreator: msgData.isCreator,
        isModerator: msgData.isModerator,
        messageType: msgData.messageType || 'chat',
      };

      // Play sound for ticket purchases (for all viewers in the stream)
      if (msgData.messageType === 'ticket_purchase') {
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }

      setMessages((prev) => {
        // Check if message already exists to avoid duplicates (by exact ID)
        if (prev.some(m => m.id === chatMessage.id)) {
          return prev;
        }
        // Check for optimistic message from same user with same content
        // Don't rely on timestamp comparison as server time may differ from client
        const optimisticIndex = prev.findIndex(m =>
          m.id.startsWith('temp-') &&
          m.userId === chatMessage.userId &&
          m.content === chatMessage.content
        );
        if (optimisticIndex !== -1) {
          // Replace optimistic message with real one
          const newMessages = [...prev];
          newMessages[optimisticIndex] = chatMessage;
          return newMessages;
        }
        // Also check for very recent duplicate content from same user (within last 10 messages)
        const recentDuplicate = prev.slice(-10).some(m =>
          m.userId === chatMessage.userId &&
          m.content === chatMessage.content &&
          m.messageType === 'chat'
        );
        if (recentDuplicate) {
          return prev;
        }
        const next = [...prev, chatMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
    },
    onGift: (giftEvent) => {
      // Add floating emoji for the gift animation (limit to 50 to prevent memory issues)
      if (giftEvent.gift) {
        setFloatingGifts(prev => {
          const newGift = {
            id: `gift-${Date.now()}-${Math.random()}`,
            emoji: giftEvent.gift.emoji,
            rarity: giftEvent.gift.rarity,
            timestamp: Date.now(),
            giftName: giftEvent.gift.name
          };
          const updated = [...prev, newGift];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });

        // Add gift message to chat
        setMessages(prev => {
          const next = [...prev, {
            id: `gift-${Date.now()}`,
            userId: giftEvent.streamGift.senderId,
            username: giftEvent.streamGift.senderUsername,
            displayName: null,
            avatarUrl: giftEvent.streamGift.senderAvatarUrl || null,
            content: `sent ${giftEvent.streamGift.quantity > 1 ? giftEvent.streamGift.quantity + 'x ' : ''}${giftEvent.gift.name}`,
            timestamp: Date.now(),
            messageType: 'gift' as const,
            giftEmoji: giftEvent.gift.emoji,
            giftName: giftEvent.gift.name,
            giftQuantity: giftEvent.streamGift.quantity,
          }];
          return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
        });
      }
      // Refresh goals when gift received
      loadStream();
    },
    onTip: (tipEvent) => {
      // Generate message content based on item type
      let content = `tipped ${tipEvent.amount} coins`;
      let messageType: ChatMessage['messageType'] = 'tip';

      if (tipEvent.menuItemLabel) {
        if (tipEvent.itemCategory === 'product' || tipEvent.fulfillmentType === 'digital') {
          content = `📥 purchased "${tipEvent.menuItemLabel}" for ${tipEvent.amount} coins`;
          messageType = 'menu_purchase';
        } else if (tipEvent.fulfillmentType === 'manual' || tipEvent.itemCategory === 'service') {
          content = `💌 ordered "${tipEvent.menuItemLabel}" for ${tipEvent.amount} coins`;
          messageType = 'menu_order';
        } else {
          content = `⭐ sent ${tipEvent.amount} coins for "${tipEvent.menuItemLabel}"`;
          messageType = 'menu_tip';
        }
      }

      // Add tip message to chat
      setMessages(prev => {
        const next = [...prev, {
          id: `tip-${Date.now()}`,
          userId: tipEvent.senderId,
          username: tipEvent.senderUsername,
          displayName: null,
          avatarUrl: tipEvent.senderAvatarUrl || null,
          content,
          timestamp: Date.now(),
          messageType,
          tipAmount: tipEvent.amount,
        }];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
      // Refresh goals when tip received
      loadStream();
    },
    onGoalUpdate: (update) => {
      // Refresh goals
      loadStream();
      // Add to celebration queue if goal completed (queue processes one at a time)
      if (update.action === 'completed' && update.goal) {
        addCompletedGoal({
          id: update.goal.id || `goal-${Date.now()}`,
          title: update.goal.title || 'Stream Goal',
          rewardText: update.goal.rewardText || 'Goal reached!',
        });
      }
    },
    onViewerCount: (count) => {
      // Update viewer count from Ably real-time updates
      setStream(prev => prev ? {
        ...prev,
        currentViewers: count.currentViewers,
        peakViewers: Math.max(prev.peakViewers, count.peakViewers),
      } : null);
    },
    onStreamEnded: () => {
      setStreamEnded(true);
    },
    onTicketedAnnouncement: (announcement) => {
      // Show the ticketed stream popup
      setTicketedAnnouncement(announcement);
    },
    onVipModeChange: (vipEvent) => {
      if (vipEvent.isActive) {
        // Ticketed mode started - check if user has ticket via API
        // IMPORTANT: Don't set state here before API call - let checkTicketAccess()
        // handle all state updates to avoid double renders that can disconnect viewers
        checkTicketAccess();
      } else {
        // Ticketed mode ended - cancel any in-flight ticket check first
        abortPendingTicketCheck();
        // Reset ALL ticketed-related state so viewer can see new announcements
        setTicketedModeActive(false);
        setTicketedShowInfo(null);
        setHasTicket(false);
        // Clear announcement/ticket purchase state for next potential show
        setHasPurchasedUpcomingTicket(false);
        setDismissedTicketedStream(null);
        setUpcomingTicketedShow(null);
        setTicketedAnnouncement(null);
      }
    },
    onMenuToggle: (event) => {
      console.log('[Menu] Real-time toggle received:', event.enabled);
      setMenuEnabled(event.enabled);

      // Fetch menu items if we don't have them yet (for pinned display)
      // Use non-blocking fetch to avoid async callback issues
      if (event.enabled && menuItems.length === 0) {
        const creatorId = stream?.creator?.id;
        if (creatorId) {
          fetch(`/api/tip-menu/${creatorId}`)
            .then(res => res.json())
            .then(menuData => {
              if (menuData.items && menuData.items.length > 0) {
                setMenuItems(menuData.items);
              }
            })
            .catch(err => {
              console.error('[Menu] Error fetching menu items on toggle:', err);
            });
        }
      }
    },
    // Poll updates from broadcaster
    onPollUpdate: (event) => {
      console.log('[Viewer] Poll update received:', event);
      if (event.action === 'ended') {
        setActivePoll(null);
      } else {
        // Fetch the latest poll data
        fetchPoll();
      }
    },
    // Countdown updates from broadcaster
    onCountdownUpdate: (event) => {
      console.log('[Viewer] Countdown update received:', event);
      if (event.action === 'ended' || event.action === 'cancelled') {
        setActiveCountdown(null);
      } else {
        // Fetch the latest countdown data
        fetchCountdown();
      }
    },
    // Guest joined the stream (viewer can see guest's video)
    onGuestJoined: (event) => {
      console.log('[Viewer] Guest joined:', event);
      setActiveGuest({
        userId: event.userId,
        username: event.username,
        displayName: event.displayName,
        avatarUrl: event.avatarUrl,
        requestType: event.requestType || 'video',
      });
    },
    // Guest removed from stream
    onGuestRemoved: (event) => {
      console.log('[Viewer] Guest removed:', event);
      setActiveGuest(null);
    },
  });

  // Use real-time viewer count from Ably if available, otherwise use stream data
  const displayViewerCount = realtimeViewerCount > 0 ? realtimeViewerCount : (stream?.currentViewers || 0);

  // Play waiting room music for non-ticket holders during ticketed streams
  useWaitingRoomMusic({
    shouldPlay: !!(ticketedModeActive && !hasTicket && ticketedShowInfo),
  });

  // Check ticket access on mount
  useEffect(() => {
    checkTicketAccess();
  }, [streamId]);

  // Join stream when viewer loads (adds to database for viewer list)
  useEffect(() => {
    if (!currentUser || !stream || stream.status !== 'live') return;

    const joinStream = async () => {
      try {
        await fetch(`/api/streams/${streamId}/join`, {
          method: 'POST',
        });
      } catch (e) {
        console.error('[Stream] Failed to join stream:', e);
      }
    };

    joinStream();
  }, [currentUser, stream?.status, streamId]);

  // Track view
  useEffect(() => {
    if (stream && currentUser) {
      streamAnalytics.viewedInline(currentUser.username, streamId);
    }
  }, [stream, currentUser, streamId]);

  // Auto-scroll chat - desktop scrolls to bottom (oldest first), mobile scrolls to top (newest first)
  useEffect(() => {
    if (chatContainerRef.current) {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        chatContainerRef.current.scrollTop = 0;
      } else {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Handle when broadcaster leaves the room (stream ended)
  const handleBroadcasterLeft = useCallback(() => {
    setStreamEnded(true);
  }, []);

  // Poll heartbeat to detect BRB state (creator disconnected)
  useBRBDetection({
    streamId,
    isLive: stream?.status === 'live',
    streamEnded,
    onBRBChange: setShowBRB,
    onStreamAutoEnd: () => setStreamEnded(true),
  });

  // Viewer heartbeat - keeps viewer active and updates viewer count
  useViewerHeartbeat({
    streamId,
    isLive: stream?.status === 'live',
    streamEnded,
    isAuthenticated: !!currentUser,
    onViewerCount: (currentViewers, peakViewers) => {
      setStream(prev => prev ? { ...prev, currentViewers, peakViewers } : null);
    },
  });

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !muted;
    setMuted(newMutedState);

    // Dismiss unmute prompt when user unmutes
    if (!newMutedState) {
      setShowUnmutePrompt(false);
    }

    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }

    if (newMutedState) {
      streamAnalytics.playerMuted(streamId);
    } else {
      streamAnalytics.playerUnmuted(streamId);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Desktop keyboard shortcuts (M=mute, F=fullscreen, C=chat, Esc=exit fullscreen)
  useViewerKeyboardShortcuts({
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onToggleChat: () => setShowChat(prev => !prev),
    isFullscreen,
  });

  // Send chat message
  const sendMessage = async () => {
    if (!messageInput.trim() || !currentUser || sendingMessage) return;

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      content: messageInput,
      timestamp: Date.now(),
      isCreator: currentUser.id === stream?.creator.id,
    };

    setMessages((prev) => {
      const next = [...prev, optimisticMessage];
      return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
    });
    setMessageInput('');
    setSendingMessage(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimisticMessage.content }),
      });

      if (!response.ok) {
        // Rollback on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      } else {
        streamAnalytics.chatMessageSent(streamId);
      }
    } catch (error) {
      console.error('[TheaterMode] Error sending message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle tip with optional note and menu item
  const handleTip = async (amount: number, note?: string, tipMenuItem?: { id: string; label: string } | null) => {
    if (!currentUser) {
      showInfo('Please sign in to send gifts');
      return;
    }

    if (userBalance < amount) {
      showInfo(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    const idempotencyKey = `tip-${crypto.randomUUID()}`;

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount,
          streamId,
          note: note?.trim() || undefined,
          tipMenuItemId: tipMenuItem?.id,
          tipMenuItemLabel: tipMenuItem?.label,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.newBalance);
        streamAnalytics.quickTipSent(streamId, amount);

        // Play sound based on tip type and amount
        if (tipMenuItem) {
          // Menu item purchase sound
          const audio = new Audio('/sounds/menu-purchase.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } else {
          // Tiered tip sound based on amount (1 coin = $0.10)
          // Common: $0.10-$0.99 (1-9 coins)
          // Nice: $1.00-$4.99 (10-49 coins)
          // Super: $5-$19.99 (50-199 coins)
          // Rare: $20-$49.99 (200-499 coins)
          // Epic: $50-$99.99 (500-999 coins)
          // Legendary: $100+ (1000+ coins)
          let soundFile = '/sounds/coin-common.mp3';
          if (amount >= 1000) {
            soundFile = '/sounds/coin-legendary.mp3';
          } else if (amount >= 500) {
            soundFile = '/sounds/coin-epic.mp3';
          } else if (amount >= 200) {
            soundFile = '/sounds/coin-rare.mp3';
          } else if (amount >= 50) {
            soundFile = '/sounds/coin-super.mp3';
          } else if (amount >= 10) {
            soundFile = '/sounds/coin-nice.mp3';
          }
          const audio = new Audio(soundFile);
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }

        // NOTE: We don't add an optimistic tip message here anymore.
        // The Ably onTip handler will add the message with proper formatting
        // (menu_purchase, menu_order, menu_tip) based on item type.
        // This prevents duplicate messages showing up in chat.

        // Show digital download confirmation if applicable
        if (data.digitalContentUrl && data.fulfillmentType === 'digital') {
          setDigitalDownload({
            show: true,
            url: data.digitalContentUrl,
            itemLabel: data.itemLabel || tipMenuItem?.label || 'Digital Product',
            amount,
          });
        }
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to send gift');
      }
    } catch (error) {
      console.error('[TheaterMode] Error sending gift:', error);
      showError('Failed to send gift');
    }
  };

  // Send gift
  const handleSendGift = async (giftId: string, quantity: number) => {
    if (!currentUser || !stream) {
      throw new Error('Please sign in to send gifts');
    }

    const idempotencyKey = `gift-${crypto.randomUUID()}`;

    const response = await fetch(`/api/streams/${streamId}/gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ giftId, quantity }),
    });

    if (response.ok) {
      const data = await response.json();
      setUserBalance(data.newBalance);
      // Gift sent successfully
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send gift');
    }
  };

  // Share stream
  const shareStream = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: stream?.title,
          text: `Watch ${stream?.creator.displayName || stream?.creator.username} live!`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showSuccess('Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled share or clipboard failed - try clipboard as fallback
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          showSuccess('Link copied to clipboard!');
        } catch {
          showError('Unable to share. Please copy the URL manually.');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Access denied - show clear instructions on how to access the stream
  if (accessDenied) {
    return (
      <AccessDeniedScreen
        accessDenied={accessDenied}
        onRetryAccess={() => {
          setAccessDenied(null);
          setLoading(true);
          loadStream();
        }}
        onNavigate={(path) => router.push(path)}
      />
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            {error || 'Stream not found'}
          </h1>
          <button
            onClick={() => router.push('/watch')}
            className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-xl font-semibold hover:scale-105 transition-all"
          >
            Browse Live Streams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white flex flex-col lg:pl-16">
      {/* Mobile Logo Header - centered, with safe area padding for notch */}
      <div
        className="lg:hidden flex items-center justify-center py-2 bg-black border-b border-cyan-400/30"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 8px))' }}
      >
        <button onClick={() => router.push('/')} className="flex items-center">
          <img
            src="/images/digis-logo-white.png"
            alt="Digis"
            className="h-6"
          />
        </button>
      </div>

      {/* Header Bar - creator info */}
      <StreamHeaderBar
        creator={stream.creator}
        viewerCount={displayViewerCount}
        muted={muted}
        showChat={showChat}
        streamEnded={streamEnded}
        clipIsSupported={clipIsSupported}
        canClip={canClip}
        clipIsClipping={clipIsClipping}
        clipBufferSeconds={clipBufferSeconds}
        clipCooldownRemaining={clipCooldownRemaining}
        onBack={() => router.back()}
        onToggleMute={toggleMute}
        onShare={shareStream}
        onCreateClip={handleCreateClip}
        onToggleChat={() => setShowChat(!showChat)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Player Area - centered on desktop when chat is hidden */}
        <div className={`flex flex-col bg-gradient-to-b from-black via-gray-900 to-black min-h-0 lg:flex-1 ${streamOrientation === 'portrait' ? 'items-center' : ''}`}>
          {/* Video - use portrait or landscape aspect ratio based on stream orientation */}
          <div className={`relative ${
            streamOrientation === 'portrait'
              ? 'aspect-[9/16] max-h-[85dvh] w-auto mx-auto'
              : 'aspect-video landscape:aspect-auto landscape:max-h-[55dvh] lg:aspect-auto lg:flex-1 lg:min-h-[75dvh] w-full'
          }`}>
            {streamEnded ? (
              /* Stream Ended State */
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-6">Stream has ended</h2>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => router.push(`/${stream?.creator.username}`)}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all"
                    >
                      View Creator Profile
                    </button>
                    <button
                      onClick={() => router.push('/watch')}
                      className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                    >
                      Browse Live Streams
                    </button>
                  </div>
                </div>
              </div>
            ) : token && serverUrl ? (
              <>
                <StreamErrorBoundary streamId={streamId} creatorName={stream?.creator.displayName || stream?.creator.username} onLeave={() => router.push('/')}>
                  <LiveKitRoom
                    token={token}
                    serverUrl={serverUrl}
                    className="h-full"
                    options={{
                      adaptiveStream: { pixelDensity: 'screen' },
                      dynacast: true,
                    }}
                  >
                    <ViewerVideo onBroadcasterLeft={handleBroadcasterLeft} />
                    <RoomAudioRenderer muted={muted} />
                  </LiveKitRoom>
                </StreamErrorBoundary>
                {/* BRB Overlay - shown when creator disconnects */}
                {showBRB && (
                  <BRBOverlay
                    streamId={streamId}
                    creatorName={stream?.creator?.displayName || stream?.creator?.username || 'Creator'}
                    isTicketed={stream?.privacy === 'private'}
                    onStreamEnded={() => setStreamEnded(true)}
                  />
                )}
                {/* Spotlighted Creator Overlay for Viewers */}
                <SpotlightedCreatorOverlay streamId={streamId} isHost={false} />

                {/* Guest Video Overlay - when host brings a viewer on stream */}
                {activeGuest && (
                  <GuestVideoOverlay
                    guestUserId={activeGuest.userId}
                    guestUsername={activeGuest.username}
                    guestDisplayName={activeGuest.displayName}
                    guestAvatarUrl={activeGuest.avatarUrl}
                    requestType={activeGuest.requestType}
                    isHost={false}
                  />
                )}

                {/* Active Poll Overlay */}
                {activePoll && activePoll.isActive && (
                  <div className="absolute bottom-12 left-3 z-40 w-[180px] sm:w-[260px]">
                    <StreamPoll
                      poll={activePoll}
                      isBroadcaster={false}
                      streamId={streamId}
                      onPollEnded={() => setActivePoll(null)}
                      onVoted={fetchPoll}
                    />
                  </div>
                )}

                {/* Active Countdown Overlay */}
                {activeCountdown && activeCountdown.isActive && (
                  <div className="absolute bottom-20 right-3 z-40 w-[180px]">
                    <StreamCountdown
                      countdown={activeCountdown}
                      isBroadcaster={false}
                      streamId={streamId}
                      onCountdownEnded={() => setActiveCountdown(null)}
                    />
                  </div>
                )}

                {/* Ticketed Stream Blocked Screen - compact overlay for non-ticket holders */}
                {ticketedModeActive && !hasTicket && ticketedShowInfo && (
                  <TicketedStreamBlockScreen
                    ticketedShowInfo={ticketedShowInfo}
                    purchasingTicket={purchasingTicket}
                    userBalance={userBalance}
                    currentUser={currentUser}
                    onPurchase={handleInstantTicketPurchase}
                    onBuyCoins={() => setShowBuyCoinsModal(true)}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-white/60 mt-4">Loading stream...</p>
                </div>
              </div>
            )}


            {/* Mobile Unmute Prompt - tap anywhere on video to unmute */}
            {muted && showUnmutePrompt && !streamEnded && token && (
              <button
                onClick={toggleMute}
                className="lg:hidden absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300"
              >
                <div className="flex flex-col items-center gap-3 px-6 py-4 bg-black/80 rounded-2xl border border-white/20 shadow-2xl">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                    <VolumeX className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white font-semibold text-lg">Tap to Unmute</span>
                  <span className="text-white/60 text-sm">Sound is muted</span>
                </div>
              </button>
            )}

            {/* Video Controls Overlay - desktop only (mobile users use phone volume/native controls) */}
            <div className="hidden lg:block absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-lg glass-dark hover:bg-white/20 transition-all shadow-lg hover:shadow-cyan-500/20 hover:scale-110"
                    aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  >
                    {muted ? (
                      <VolumeX className="w-6 h-6" />
                    ) : (
                      <Volume2 className="w-6 h-6" />
                    )}
                  </button>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg glass-dark hover:bg-white/20 transition-all shadow-lg hover:shadow-cyan-500/20 hover:scale-110"
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-6 h-6" />
                  ) : (
                    <Maximize className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Stream Info Bar */}
          <div className="px-3 lg:pl-6 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)]">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-pink-100 bg-clip-text text-transparent truncate">{stream.title}</h2>
              {/* Category Badge */}
              {stream.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-300 flex-shrink-0">
                  <span>{getCategoryIcon(stream.category)}</span>
                  <span>{getCategoryById(stream.category)?.name || stream.category}</span>
                </span>
              )}
              {/* Tags */}
              {stream.tags && stream.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {stream.tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {stream.description && (
              <p className="text-xs text-white/80 truncate hidden sm:block mt-1">{stream.description}</p>
            )}
          </div>

          {/* Goal Bar - visible on all screen sizes */}
          {stream && stream.goals && stream.goals.length > 0 && !streamEnded && stream.goals.some((g: any) => g.isActive && !g.isCompleted) && (
            <div className="px-3 lg:px-4 lg:pl-6 py-2">
              <TronGoalBar
                goals={stream.goals
                  .filter((g: any) => g.isActive && !g.isCompleted)
                  .map((g: any) => ({
                    id: g.id,
                    title: g.title || 'Stream Goal',
                    description: g.description,
                    rewardText: g.rewardText,
                    targetAmount: g.targetAmount,
                    currentAmount: g.currentAmount,
                  }))}
              />
            </div>
          )}

          {/* Mobile Action Bar - inline below goal bar */}
          {!streamEnded && (
            <div className="lg:hidden px-3 py-2 glass-dark border-t border-cyan-400/20 overflow-visible">
              <div className="flex items-center gap-3 overflow-visible">
                {/* Tip Button with Menu indicator - 44px touch target */}
                {currentUser && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="relative min-w-[44px] min-h-[44px] p-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-xl shadow-lg shadow-cyan-500/30 flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <Coins className="w-5 h-5" />
                    {menuEnabled && menuItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-500 rounded-full animate-pulse border-2 border-black" />
                    )}
                  </button>
                )}
                {/* Go Private Button - mobile */}
                {stream.creatorCallSettings && currentUser && stream.goPrivateEnabled !== false && (
                  <div className="flex-shrink-0">
                    <RequestCallButton
                      creatorId={stream.creator.id}
                      creatorName={stream.creator.displayName || stream.creator.username}
                      ratePerMinute={stream.goPrivateRate ?? stream.creatorCallSettings.callRatePerMinute}
                      minimumDuration={stream.goPrivateMinDuration ?? stream.creatorCallSettings.minimumCallDuration}
                      isAvailable={stream.creatorCallSettings.isAvailableForCalls}
                      callType="video"
                      iconOnly
                    />
                  </div>
                )}
                {/* Gift Bar - inline */}
                <div className="flex-1 relative z-50">
                  <FloatingGiftBar
                    streamId={streamId}
                    creatorId={stream.creator.id}
                    onSendGift={handleSendGift}
                    userBalance={userBalance}
                    isAuthenticated={!!currentUser}
                    onAuthRequired={() => router.push(`/login?redirect=/live/${streamId}`)}
                    onBuyCoins={() => setShowBuyCoinsModal(true)}
                    inline
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mobile Chat Section - below action bar */}
          <div className="lg:hidden flex-1 flex flex-col min-h-0 bg-black/40">
            {menuEnabled && menuItems.length > 0 && (
              <PinnedMenuPreview menuItems={menuItems} onOpenMenu={() => setShowMenuModal(true)} variant="mobile" />
            )}
            <ViewerChatMessages messages={displayMessages} chatContainerRef={chatContainerRef} variant="mobile" />
            <ViewerChatInput
              messageInput={messageInput}
              onMessageChange={setMessageInput}
              onSend={sendMessage}
              sendingMessage={sendingMessage}
              currentUser={currentUser}
              userBalance={userBalance}
              ticketedModeActive={ticketedModeActive}
              hasTicket={hasTicket}
              onBuyCoins={() => setShowBuyCoinsModal(true)}
              onLogin={() => router.push(`/login?redirect=/live/${streamId}`)}
              variant="mobile"
            />
          </div>

          {/* Action Buttons Bar - desktop only */}
          <div className="hidden lg:flex px-4 lg:pl-6 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)] items-center justify-start gap-3 overflow-visible">
            {/* Send Tip Button - opens modal */}
            <button
              onClick={() => setShowTipModal(true)}
              disabled={!currentUser}
              className="relative px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-300/50 flex items-center gap-2 flex-shrink-0"
            >
              <Coins className="w-4 h-4" />
              <span>Send Tip</span>
              {menuEnabled && menuItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Go Private Button */}
            {stream.creatorCallSettings && stream.goPrivateEnabled !== false && (
              <div className="flex-shrink-0">
                <RequestCallButton
                  creatorId={stream.creator.id}
                  creatorName={stream.creator.displayName || stream.creator.username}
                  ratePerMinute={stream.goPrivateRate ?? stream.creatorCallSettings.callRatePerMinute}
                  minimumDuration={stream.goPrivateMinDuration ?? stream.creatorCallSettings.minimumCallDuration}
                  isAvailable={stream.creatorCallSettings.isAvailableForCalls}
                  callType="video"
                />
              </div>
            )}

            {/* Menu Button - only shows when enabled */}
            {menuEnabled && menuItems.length > 0 && (
              <button
                onClick={() => setShowMenuModal(true)}
                disabled={!currentUser}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed border border-pink-300/50 flex items-center gap-2 flex-shrink-0"
              >
                <List className="w-4 h-4" />
                <span>Menu</span>
              </button>
            )}

            {/* Ticketed Stream Button - for late-joining viewers or after dismissing popup */}
            {(upcomingTicketedShow || dismissedTicketedStream) && !ticketedAnnouncement && !hasPurchasedUpcomingTicket && (
              <button
                onClick={() => {
                  const showId = upcomingTicketedShow?.id || dismissedTicketedStream?.ticketedStreamId;
                  const title = upcomingTicketedShow?.title || dismissedTicketedStream?.title || 'Private Stream';
                  const price = upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice || 0;
                  if (showId) {
                    setQuickBuyInfo({ showId, title, price });
                    setShowQuickBuyModal(true);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-300/50 flex items-center gap-2 flex-shrink-0"
              >
                <Ticket className="w-4 h-4" />
                <span>Get Ticket</span>
                <Coins className="w-3 h-3 text-amber-800" />
                <span className="text-amber-800">{upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice}</span>
                {ticketCountdown && (
                  <span className="text-amber-900 text-xs ml-1">• {ticketCountdown}</span>
                )}
              </button>
            )}

            {/* Inline Gift Bar - desktop */}
            {stream && !streamEnded && (
              <div className="flex-1 relative overflow-visible">
                <FloatingGiftBar
                  streamId={streamId}
                  creatorId={stream.creator.id}
                  onSendGift={handleSendGift}
                  userBalance={userBalance}
                  isAuthenticated={!!currentUser}
                  onAuthRequired={() => router.push(`/login?redirect=/live/${streamId}`)}
                  onBuyCoins={() => setShowBuyCoinsModal(true)}
                  inline
                />
              </div>
            )}

            </div>

          {/* Mobile Gift Bar is now floating - see bottom of page */}

        </div>

        {/* Right Sidebar - Chat & Viewers (Desktop only - mobile uses overlay chat) */}
        {showChat && (
          <div className="hidden lg:flex w-[340px] glass-dark border-l border-cyan-400/30 flex-col backdrop-blur-2xl shadow-[-4px_0_30px_rgba(34,211,238,0.15)]">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/5 to-pink-500/5">
              <button
                onClick={() => setShowViewerList(false)}
                className={`flex-1 px-4 py-3 font-bold transition-all ${
                  !showViewerList
                    ? 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-b-2 border-cyan-400 shadow-[0_2px_15px_rgba(34,211,238,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setShowViewerList(true)}
                className={`flex-1 px-4 py-3 font-bold transition-all ${
                  showViewerList
                    ? 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-b-2 border-cyan-400 shadow-[0_2px_15px_rgba(34,211,238,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{displayViewerCount}</span>
                </div>
              </button>
            </div>

            {/* Chat View */}
            {!showViewerList && (
              <>
                {menuEnabled && menuItems.length > 0 && (
                  <PinnedMenuPreview menuItems={menuItems} onOpenMenu={() => setShowMenuModal(true)} variant="desktop" />
                )}
                <ViewerChatMessages messages={messages} chatContainerRef={chatContainerRef} variant="desktop" />
                <ViewerChatInput
                  messageInput={messageInput}
                  onMessageChange={setMessageInput}
                  onSend={sendMessage}
                  sendingMessage={sendingMessage}
                  currentUser={currentUser}
                  userBalance={userBalance}
                  ticketedModeActive={ticketedModeActive}
                  hasTicket={hasTicket}
                  onBuyCoins={() => setShowBuyCoinsModal(true)}
                  onLogin={() => router.push(`/login?redirect=/live/${streamId}`)}
                  variant="desktop"
                />
              </>
            )}

            {/* Viewer List View */}
            {showViewerList && (
              <ViewerListPanel viewers={viewers} leaderboard={leaderboard} />
            )}
          </div>
        )}
      </div>


      {/* Desktop Floating Gift Bar - removed: now inline in desktop action bar */}

      {/* Mobile Goal Bar - floating at top (matches creator mobile POV) */}
      {stream && stream.goals && stream.goals.length > 0 && !streamEnded && stream.goals.some((g: any) => g.isActive && !g.isCompleted) && (
        <div className="lg:hidden fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[55%] max-w-[220px]">
          <TronGoalBar
            goals={stream.goals
              .filter((g: any) => g.isActive && !g.isCompleted)
              .map((g: any) => ({
                id: g.id,
                title: g.title || 'Stream Goal',
                description: g.description,
                rewardText: g.rewardText,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
              }))}
          />
        </div>
      )}

      {/* Stream Ended Full-Screen Overlay */}
      {streamEnded && (
        <StreamEndedOverlay
          creatorUsername={stream?.creator.username || ''}
          onNavigate={(path) => router.push(path)}
        />
      )}

      {/* Floating Gift Emojis Animation */}
      <GiftFloatingEmojis gifts={floatingGifts} onComplete={removeFloatingGift} />

      {/* Goal Completed Celebration (Queue-based - shows all completed goals one by one) */}
      {celebratingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{celebratingGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{celebratingGoal.rewardText}</span>
            </div>
            {/* Show queue indicator if more goals are pending */}
            {completedGoalsQueue.length > 0 && (
              <div className="mt-3 text-sm text-gray-400">
                +{completedGoalsQueue.length} more goal{completedGoalsQueue.length > 1 ? 's' : ''} unlocked!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Purchase Success Toast */}
      {showTicketPurchaseSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-slideDown">
          <div className="px-6 py-4 bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-xl rounded-2xl border border-green-400/50 shadow-[0_0_30px_rgba(34,197,94,0.5)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Ticket Purchased!</p>
              <p className="text-white/80 text-sm">You have access when the stream starts</p>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Ticket Button - shows for late-joining viewers or after dismissing popup */}
      {(upcomingTicketedShow || dismissedTicketedStream) && !ticketedAnnouncement && !showQuickBuyModal && !hasPurchasedUpcomingTicket && (
        <button
          onClick={() => {
            const showId = upcomingTicketedShow?.id || dismissedTicketedStream?.ticketedStreamId;
            const title = upcomingTicketedShow?.title || dismissedTicketedStream?.title || 'Private Stream';
            const price = upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice || 0;
            if (showId) {
              setQuickBuyInfo({ showId, title, price });
              setShowQuickBuyModal(true);
            }
          }}
          className="lg:hidden fixed top-20 right-3 z-50 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 rounded-xl font-bold text-black text-xs transition-all hover:scale-105 shadow-lg shadow-amber-500/40 flex flex-col items-center"
        >
          <div className="flex items-center gap-1">
            <Ticket className="w-3 h-3" />
            <Coins className="w-3 h-3 text-amber-800" />
            <span className="text-amber-800">{upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice}</span>
          </div>
          {ticketCountdown && (
            <div className="text-[10px] text-amber-900 font-medium">
              {ticketCountdown}
            </div>
          )}
        </button>
      )}

      {/* Tip Modal with Optional Note */}
      {showTipModal && (
        <TipModal
          creatorUsername={stream?.creator.username || ''}
          userBalance={userBalance}
          onSendTip={(amount, note) => handleTip(amount, note, null)}
          onClose={() => setShowTipModal(false)}
        />
      )}

      {/* Menu Modal - Purple/Pink themed */}
      {showMenuModal && (
        <MenuModal
          creatorUsername={stream?.creator.username || ''}
          userBalance={userBalance}
          menuItems={menuItems}
          onPurchase={(price, note, item) => handleTip(price, note, item)}
          onClose={() => setShowMenuModal(false)}
          onBuyCoins={() => setShowBuyCoinsModal(true)}
        />
      )}

      {/* Ticketed Show Announcement Popup */}
      {ticketedAnnouncement && (
        <TicketAnnouncementModal
          announcement={ticketedAnnouncement}
          userBalance={userBalance}
          currentUser={currentUser}
          quickBuyLoading={quickBuyLoading}
          onPurchase={handleQuickBuyTicket}
          onDismiss={(dismissed) => {
            setDismissedTicketedStream(dismissed);
            setTicketedAnnouncement(null);
          }}
          onBuyCoins={() => setShowBuyCoinsModal(true)}
        />
      )}

      {/* Simple Quick Buy Modal - for persistent button */}
      {showQuickBuyModal && quickBuyInfo && (
        <QuickBuyTicketModal
          quickBuyInfo={quickBuyInfo}
          ticketCountdown={ticketCountdown}
          userBalance={userBalance}
          currentUser={currentUser}
          quickBuyLoading={quickBuyLoading}
          onPurchase={handleQuickBuyTicket}
          onClose={() => {
            setShowQuickBuyModal(false);
            setQuickBuyInfo(null);
          }}
          onBuyCoins={() => setShowBuyCoinsModal(true)}
        />
      )}

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showBuyCoinsModal}
        onClose={() => setShowBuyCoinsModal(false)}
        onSuccess={() => {
          // Refresh user balance after successful purchase
          loadCurrentUser();
          setShowBuyCoinsModal(false);
        }}
      />

      {/* Digital Download Confirmation Modal */}
      {digitalDownload?.show && (
        <DigitalDownloadModal
          digitalDownload={digitalDownload}
          onClose={() => setDigitalDownload(null)}
        />
      )}
    </div>
  );
}
