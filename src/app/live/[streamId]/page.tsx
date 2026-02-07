'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { streamAnalytics } from '@/lib/utils/analytics';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Volume2, VolumeX, Maximize, Minimize, Users,
  Share2, X, Send, Ticket, Coins, List,
  Download, CheckCircle, Lock, UserPlus, CreditCard, Scissors
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
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import { TipModal } from '@/components/streaming/TipModal';
import { MenuModal } from '@/components/streaming/MenuModal';
import { useToastContext } from '@/context/ToastContext';
import { getCategoryById, getCategoryIcon } from '@/lib/constants/stream-categories';

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  status: 'live' | 'ended';
  privacy: 'public' | 'private' | 'followers';
  currentViewers: number;
  peakViewers: number;
  totalViews: number;
  totalGiftsReceived: number;
  tipMenuEnabled?: boolean;
  // Category & Tags for discoverability
  category?: string | null;
  tags?: string[] | null;
  // Go Private settings (stream-specific)
  goPrivateEnabled?: boolean;
  goPrivateRate?: number | null;
  goPrivateMinDuration?: number | null;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  goals?: {
    id: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
  }[];
  creatorCallSettings?: {
    isAvailableForCalls: boolean;
    isAvailableForVoiceCalls: boolean;
    callRatePerMinute: number;
    voiceCallRatePerMinute: number;
    minimumCallDuration: number;
    minimumVoiceCallDuration: number;
    messageRate?: number;
  } | null;
  upcomingTicketedShow?: {
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
  } | null;
}

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

interface Viewer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// Helper to validate URLs for security (prevent javascript: and other malicious protocols)
function isValidDownloadUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
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

  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<{
    reason: string;
    creatorId?: string;
    creatorUsername?: string;
    requiresSubscription?: boolean;
    requiresFollow?: boolean;
    requiresTicket?: boolean;
    ticketPrice?: number;
    subscriptionPrice?: number;
  } | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [showBRB, setShowBRB] = useState(false);
  const [streamOrientation, setStreamOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true); // Show tap to unmute prompt on mobile

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showViewerList, setShowViewerList] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const { celebratingGoal, completedGoalsQueue, addCompletedGoal } = useGoalCelebrations();
  const [menuItems, setMenuItems] = useState<Array<{ id: string; label: string; emoji: string | null; price: number; description: string | null; itemCategory?: string; fulfillmentType?: string }>>([]);
  const [menuEnabled, setMenuEnabled] = useState(true); // Menu enabled by default

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Memoized reversed message list for performance
  const displayMessages = useMemo(() => {
    return [...messages].slice(-50).reverse();
  }, [messages]);

  // Viewers state
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; username: string; avatarUrl?: string; totalSpent: number }>>([]);

  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);

  // Floating gift emojis state
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>>([]);

  // Ticketed show announcement state
  const [ticketedAnnouncement, setTicketedAnnouncement] = useState<{
    ticketedStreamId: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
    minutesUntilStart: number;
  } | null>(null);

  // Track dismissed ticketed stream for persistent button
  const [dismissedTicketedStream, setDismissedTicketedStream] = useState<{
    ticketedStreamId: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
  } | null>(null);

  // Quick buy modal state (for simple ticket purchase)
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);

  // Digital download confirmation state
  const [digitalDownload, setDigitalDownload] = useState<{
    show: boolean;
    url: string;
    itemLabel: string;
    amount: number;
  } | null>(null);
  const [quickBuyInfo, setQuickBuyInfo] = useState<{
    showId: string;
    title: string;
    price: number;
  } | null>(null);
  const [quickBuyLoading, setQuickBuyLoading] = useState(false);

  // Track if user has purchased ticket for upcoming show (before it starts)
  const [hasPurchasedUpcomingTicket, setHasPurchasedUpcomingTicket] = useState(false);
  const [showTicketPurchaseSuccess, setShowTicketPurchaseSuccess] = useState(false);

  // Upcoming ticketed show from creator (for late-joining viewers)
  const [upcomingTicketedShow, setUpcomingTicketedShow] = useState<{
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
  } | null>(null);

  // Countdown timer for ticketed stream (computed from startsAt)
  const ticketCountdown = useTicketCountdown(upcomingTicketedShow?.startsAt || dismissedTicketedStream?.startsAt || null);

  // Ticketed stream mode state (when host activates ticketed stream)
  const [ticketedModeActive, setTicketedModeActive] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [ticketedShowInfo, setTicketedShowInfo] = useState<{
    showId: string;
    showTitle: string;
    ticketPrice: number;
  } | null>(null);
  const [purchasingTicket, setPurchasingTicket] = useState(false);

  // Poll and Countdown state (shared with broadcaster)
  const [activePoll, setActivePoll] = useState<{
    id: string;
    question: string;
    options: string[];
    voteCounts: number[];
    totalVotes: number;
    endsAt: string;
    isActive: boolean;
  } | null>(null);
  const [activeCountdown, setActiveCountdown] = useState<{
    id: string;
    label: string;
    endsAt: string;
    isActive: boolean;
  } | null>(null);

  // Guest call-in state (when host brings a viewer on stream)
  const [activeGuest, setActiveGuest] = useState<{
    userId: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    requestType: 'video' | 'voice';
  } | null>(null);

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
        return [...prev, chatMessage];
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
        setMessages(prev => [...prev, {
          id: `gift-${Date.now()}`,
          userId: giftEvent.streamGift.senderId,
          username: giftEvent.streamGift.senderUsername,
          displayName: null,
          avatarUrl: giftEvent.streamGift.senderAvatarUrl || null,
          content: `sent ${giftEvent.streamGift.quantity > 1 ? giftEvent.streamGift.quantity + 'x ' : ''}${giftEvent.gift.name}`,
          timestamp: Date.now(),
          messageType: 'gift',
          giftEmoji: giftEvent.gift.emoji,
          giftName: giftEvent.gift.name,
          giftQuantity: giftEvent.streamGift.quantity,
        }]);
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
      setMessages(prev => [...prev, {
        id: `tip-${Date.now()}`,
        userId: tipEvent.senderId,
        username: tipEvent.senderUsername,
        displayName: null,
        avatarUrl: tipEvent.senderAvatarUrl || null,
        content,
        timestamp: Date.now(),
        messageType,
        tipAmount: tipEvent.amount,
      }]);
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
        // Ticketed mode ended - return to free stream
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

  // Check ticketed stream access for current user
  const checkTicketAccess = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/vip`);
      if (response.ok) {
        const data = await response.json();
        setTicketedModeActive(data.vipActive);
        setHasTicket(data.hasAccess);
        if (data.vipActive && data.showId) {
          setTicketedShowInfo({
            showId: data.showId,
            showTitle: data.showTitle,
            ticketPrice: data.ticketPrice,
          });
        }
      }
    } catch (error) {
      console.error('[Ticketed] Error checking ticket access:', error);
    }
  };

  // Instant ticket purchase - deducts coins and grants immediate access
  const handleInstantTicketPurchase = async () => {
    if (!ticketedShowInfo || !currentUser) {
      if (!currentUser) {
        router.push('/login');
      }
      return;
    }

    // Check if user has enough coins
    if (userBalance < ticketedShowInfo.ticketPrice) {
      setShowBuyCoinsModal(true);
      return;
    }

    setPurchasingTicket(true);
    try {
      const response = await fetch(`/api/shows/${ticketedShowInfo.showId}/purchase`, {
        method: 'POST',
      });

      if (response.ok) {
        const successData = await response.json();
        // Play ticket purchase sound
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        // Update balance and grant access - use server balance if available
        if (typeof successData.newBalance === 'number') {
          setUserBalance(successData.newBalance);
        } else {
          setUserBalance(prev => prev - ticketedShowInfo.ticketPrice);
        }
        setHasTicket(true);
      } else {
        const data = await response.json();
        if (data.error?.includes('Insufficient')) {
          setShowBuyCoinsModal(true);
        } else {
          showError(data.error || 'Failed to purchase ticket');
        }
      }
    } catch (error) {
      console.error('[Ticketed] Error purchasing ticket:', error);
      showError('Failed to purchase ticket. Please try again.');
    } finally {
      setPurchasingTicket(false);
    }
  };

  // Quick buy ticket - instant purchase from announcement or persistent button
  const handleQuickBuyTicket = async (showId: string, price: number) => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    // Check if user has enough coins
    if (userBalance < price) {
      setShowBuyCoinsModal(true);
      return;
    }

    setQuickBuyLoading(true);
    try {
      const response = await fetch(`/api/shows/${showId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId }), // Pass streamId for chat broadcast
      });

      const data = await response.json();

      if (response.ok) {
        // Play ticket purchase sound
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});

        // Update balance
        setUserBalance(prev => prev - price);
        // Close any modals/popups
        setShowQuickBuyModal(false);
        setQuickBuyInfo(null);
        setTicketedAnnouncement(null);
        setDismissedTicketedStream(null);
        setUpcomingTicketedShow(null);
        // Mark as purchased
        setHasPurchasedUpcomingTicket(true);
        setHasTicket(true);
        // Show success message
        setShowTicketPurchaseSuccess(true);
        setTimeout(() => setShowTicketPurchaseSuccess(false), 3000);
      } else {
        if (data.error?.includes('Insufficient')) {
          setShowBuyCoinsModal(true);
        } else if (data.error?.includes('already')) {
          // Already has ticket - just close and grant access
          setShowQuickBuyModal(false);
          setQuickBuyInfo(null);
          setTicketedAnnouncement(null);
          setDismissedTicketedStream(null);
          setUpcomingTicketedShow(null);
          setHasPurchasedUpcomingTicket(true);
          setHasTicket(true);
        } else {
          showError(data.error || 'Failed to purchase ticket');
        }
      }
    } catch (error) {
      console.error('[Ticketed] Error purchasing ticket:', error);
      showError('Failed to purchase ticket. Please try again.');
    } finally {
      setQuickBuyLoading(false);
    }
  };

  // Use real-time viewer count from Ably if available, otherwise use stream data
  const displayViewerCount = realtimeViewerCount > 0 ? realtimeViewerCount : (stream?.currentViewers || 0);

  // Play waiting room music for non-ticket holders during ticketed streams
  useWaitingRoomMusic({
    shouldPlay: !!(ticketedModeActive && !hasTicket && ticketedShowInfo),
  });

  // Load stream data
  useEffect(() => {
    loadStream();
    loadCurrentUser();
    checkTicketAccess(); // Check if ticketed stream mode is active
    fetchPoll(); // Fetch active poll for late-joining viewers
    fetchCountdown(); // Fetch active countdown for late-joining viewers
    fetchActiveGuest(); // Fetch active guest for late-joining viewers
  }, [streamId]);

  // Poll for active poll vote updates (every 15 seconds) as fallback - Ably handles real-time updates
  useEffect(() => {
    if (!activePoll?.isActive) return;

    const interval = setInterval(fetchPoll, 15000);
    return () => clearInterval(interval);
  }, [activePoll?.isActive, streamId]);

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
      // Check if we're on mobile (lg breakpoint is 1024px)
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        // Mobile shows newest first (reversed), so scroll to top
        chatContainerRef.current.scrollTop = 0;
      } else {
        // Desktop shows oldest first, so scroll to bottom
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Load LiveKit token for viewing
  useEffect(() => {
    if (!stream || stream.status !== 'live') return;

    const loadToken = async () => {
      try {
        const response = await fetch(`/api/streams/${streamId}/token`);
        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
          setServerUrl(data.serverUrl);
        }
      } catch (error) {
        console.error('[TheaterMode] Error loading token:', error);
      }
    };

    loadToken();
  }, [stream, streamId]);

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

  // Fetch viewers and leaderboard when viewer list is opened
  useEffect(() => {
    if (!showViewerList || !streamId) return;

    const fetchViewers = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/viewers`);
        if (res.ok) {
          const data = await res.json();
          setViewers(data.viewers || []);
        }
      } catch (e) {
        console.error('[Stream] Failed to fetch viewers:', e);
      }
    };

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/leaderboard?limit=5`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (e) {
        console.error('[Stream] Failed to fetch leaderboard:', e);
      }
    };

    fetchViewers();
    fetchLeaderboard();
    // Refresh every 20 seconds while open
    const interval = setInterval(() => {
      fetchViewers();
      fetchLeaderboard();
    }, 20000);

    return () => clearInterval(interval);
  }, [showViewerList, streamId]);

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

  // Ticket countdown handled by useTicketCountdown hook

  const loadStream = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);

      // Handle 403 Access Denied with detailed info
      if (response.status === 403) {
        const data = await response.json();
        setAccessDenied({
          reason: data.error || 'Access denied',
          creatorId: data.creatorId,
          creatorUsername: data.creatorUsername,
          requiresSubscription: data.requiresSubscription,
          requiresFollow: data.requiresFollow,
          requiresTicket: data.requiresTicket,
          ticketPrice: data.ticketPrice,
          subscriptionPrice: data.subscriptionPrice,
        });
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Stream not found');
      }

      const data = await response.json();
      const streamData = data.stream || data; // Handle both { stream } and direct stream object
      setStream(streamData);

      // Set stream orientation from database (default to landscape for backwards compatibility)
      if (streamData.orientation === 'portrait') {
        setStreamOrientation('portrait');
      } else {
        setStreamOrientation('landscape');
      }

      // Set menu enabled state from stream data (database column is tipMenuEnabled)
      // Only update if we get a definitive boolean value to avoid race conditions
      if (typeof streamData.tipMenuEnabled === 'boolean') {
        console.log('[Menu] Stream tipMenuEnabled:', streamData.tipMenuEnabled);
        setMenuEnabled(streamData.tipMenuEnabled);
      }

      // Fetch menu items for this creator (for pinned menu display)
      const creatorId = streamData.creator?.id || streamData.creatorId;
      console.log('[Menu] Creator ID:', creatorId);
      if (creatorId) {
        fetch(`/api/tip-menu/${creatorId}`)
          .then(res => res.json())
          .then(menuData => {
            console.log('[Menu] Menu items fetched:', menuData.items?.length || 0, 'items');
            if (menuData.items && menuData.items.length > 0) {
              setMenuItems(menuData.items);
            }
          })
          .catch(err => console.error('Error fetching menu:', err));
      }

      // Set upcoming ticketed show for late-joining viewers
      if (streamData.upcomingTicketedShow && !dismissedTicketedStream && !ticketedAnnouncement) {
        setUpcomingTicketedShow(streamData.upcomingTicketedShow);
      }

      if (streamData.status === 'ended') {
        setError('This stream has ended');
      }
    } catch (err) {
      setError('Failed to load stream');
      console.error('[TheaterMode] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active poll for late-joining viewers
  const fetchPoll = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/polls`);
      const data = await response.json();
      if (response.ok && data.poll) {
        console.log('[Viewer] Poll fetched:', data.poll);
        setActivePoll(data.poll);
      } else {
        setActivePoll(null);
      }
    } catch (err) {
      console.error('[Viewer] Error fetching poll:', err);
    }
  };

  // Fetch active countdown for late-joining viewers
  const fetchCountdown = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/countdown`);
      const data = await response.json();
      if (response.ok && data.countdown) {
        console.log('[Viewer] Countdown fetched:', data.countdown);
        setActiveCountdown(data.countdown);
      } else {
        setActiveCountdown(null);
      }
    } catch (err) {
      console.error('[Viewer] Error fetching countdown:', err);
    }
  };

  // Fetch active guest for late-joining viewers
  const fetchActiveGuest = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/guest`);
      const data = await response.json();
      if (response.ok && data.activeGuest) {
        console.log('[Viewer] Active guest fetched:', data.activeGuest);
        setActiveGuest(data.activeGuest);
      }
    } catch (err) {
      console.error('[Viewer] Error fetching active guest:', err);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        setCurrentUser(data.user);

        // Load wallet balance
        const walletResponse = await fetch('/api/wallet/balance');
        const walletData = await walletResponse.json();
        setUserBalance(walletData.balance || 0);
      }
    } catch (error) {
      console.error('[TheaterMode] Error loading user:', error);
    }
  };

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

    setMessages((prev) => [...prev, optimisticMessage]);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-6 p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 inline-block">
            <Lock className="w-12 h-12 text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            This Stream is Private
          </h1>
          <p className="text-gray-400 mb-4">
            {accessDenied.requiresSubscription
              ? 'You must be an active subscriber to watch this stream.'
              : accessDenied.requiresFollow
                ? 'You must be following this creator to watch this stream.'
                : accessDenied.requiresTicket
                  ? 'This is a ticketed show. Purchase a ticket to watch.'
                  : accessDenied.reason}
          </p>

          {/* Action buttons based on what's required */}
          <div className="space-y-3">
            {accessDenied.requiresFollow && accessDenied.creatorUsername && (
              <button
                onClick={() => router.push(`/${accessDenied.creatorUsername}`)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-purple text-white rounded-xl font-semibold hover:scale-105 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                Follow @{accessDenied.creatorUsername}
              </button>
            )}

            {accessDenied.requiresSubscription && accessDenied.creatorUsername && (
              <button
                onClick={() => router.push(`/${accessDenied.creatorUsername}`)}
                className="w-full flex flex-col items-center justify-center gap-1 px-6 py-3 bg-gradient-to-r from-digis-purple to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-all"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscribe to @{accessDenied.creatorUsername}
                </div>
                {accessDenied.subscriptionPrice && (
                  <span className="text-sm opacity-90 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> {accessDenied.subscriptionPrice} coins/month
                  </span>
                )}
              </button>
            )}

            {accessDenied.requiresTicket && accessDenied.creatorUsername && (
              <button
                onClick={() => router.push(`/${accessDenied.creatorUsername}`)}
                className="w-full flex flex-col items-center justify-center gap-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded-xl font-semibold hover:scale-105 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Buy Ticket
                </div>
                {accessDenied.ticketPrice && (
                  <span className="text-sm opacity-90 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> {accessDenied.ticketPrice} coins
                  </span>
                )}
              </button>
            )}

            {/* Already subscribed? Retry access check */}
            {(accessDenied.requiresSubscription || accessDenied.requiresTicket) && (
              <button
                onClick={() => {
                  setAccessDenied(null);
                  setLoading(true);
                  loadStream();
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-xl font-medium transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Already Subscribed? Try Again
              </button>
            )}

            {/* Visit creator profile if username available */}
            {accessDenied.creatorUsername && (
              <button
                onClick={() => router.push(`/${accessDenied.creatorUsername}`)}
                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
              >
                Visit Creator Profile
              </button>
            )}

            {/* Browse other streams */}
            <button
              onClick={() => router.push('/watch')}
              className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Browse Other Streams
            </button>
          </div>
        </div>
      </div>
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
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 glass-dark border-b border-cyan-400/20 backdrop-blur-xl shadow-[0_0_15px_rgba(34,211,238,0.1)]">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button
            onClick={() => router.back()}
            className="hidden lg:block p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Creator Info - compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {stream.creator.avatarUrl ? (
              <img
                src={stream.creator.avatarUrl}
                alt={stream.creator.displayName || stream.creator.username}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center font-bold text-sm flex-shrink-0">
                {stream.creator.displayName?.[0] || stream.creator.username?.[0] || '?'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-bold text-sm sm:text-base truncate">
                  {stream.creator.displayName || stream.creator.username}
                </span>
                {stream.creator.isVerified && (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="text-xs text-white/60">
                {displayViewerCount.toLocaleString()} watching
              </div>
            </div>
          </div>

          {/* Live Badge */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-red-600 rounded-lg flex-shrink-0">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-bold">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Mute Toggle Button - mobile only */}
          <button
            onClick={toggleMute}
            className={`lg:hidden p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${muted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
            title={muted ? 'Unmute' : 'Mute'}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Share Button */}
          <button
            onClick={shareStream}
            className="p-2.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Share"
            aria-label="Share stream"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Clip Button - viewers can clip the last 30 seconds */}
          {clipIsSupported && !streamEnded && (
            <button
              onClick={handleCreateClip}
              disabled={!canClip || clipIsClipping}
              className={`p-2.5 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                clipIsClipping
                  ? 'bg-green-500/20 text-green-400 animate-pulse'
                  : clipCooldownRemaining > 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : canClip
                      ? 'hover:bg-green-500/20 text-green-400'
                      : 'text-gray-600'
              }`}
              title={
                clipIsClipping ? 'Creating clip...'
                  : clipCooldownRemaining > 0 ? `Wait ${clipCooldownRemaining}s`
                    : canClip ? `Clip last ${clipBufferSeconds}s`
                      : 'Buffering...'
              }
              aria-label={
                clipIsClipping ? 'Creating clip...'
                  : clipCooldownRemaining > 0 ? `Clip cooldown: ${clipCooldownRemaining} seconds`
                    : canClip ? `Clip last ${clipBufferSeconds} seconds`
                      : 'Clip not available'
              }
            >
              {clipCooldownRemaining > 0 ? (
                <span className="text-xs font-bold tabular-nums">{clipCooldownRemaining}s</span>
              ) : (
                <Scissors className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Toggle Chat Button - desktop only since chat is always visible below video on mobile */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`hidden sm:flex p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] items-center justify-center ${showChat ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10'}`}
            title={showChat ? 'Hide Chat' : 'Show Chat'}
            aria-label={showChat ? 'Hide chat panel' : 'Show chat panel'}
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

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
                  <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6">
                    {/* Compact layout for mobile */}
                    <div className="flex flex-col items-center max-w-xs w-full">
                      {/* Lock Icon + Badge combined */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/50 flex items-center justify-center">
                        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg sm:text-xl font-bold text-white mb-1 text-center line-clamp-2">
                        {ticketedShowInfo.showTitle}
                      </h2>

                      {/* Ticketed Stream Badge */}
                      <div className="mb-3 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full">
                        <span className="text-amber-400 font-semibold text-xs">TICKETED STREAM</span>
                      </div>

                      {/* Price + Buy Button combined */}
                      <button
                        onClick={handleInstantTicketPurchase}
                        disabled={purchasingTicket}
                        className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-base hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {purchasingTicket ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Purchasing...</span>
                          </>
                        ) : (
                          <>
                            <Ticket className="w-4 h-4" />
                            <span>Buy Ticket</span>
                            <span className="mx-1">•</span>
                            <Coins className="w-4 h-4 text-yellow-200" />
                            <span>{ticketedShowInfo.ticketPrice}</span>
                          </>
                        )}
                      </button>

                      {/* Balance indicator */}
                      {currentUser && (
                        <p className="mt-2 text-xs text-gray-400">
                          Your balance: <Coins className="w-3 h-3 inline text-yellow-400" /> {userBalance}
                          {userBalance < ticketedShowInfo.ticketPrice && (
                            <button
                              onClick={() => setShowBuyCoinsModal(true)}
                              className="ml-2 text-cyan-400 hover:underline"
                            >
                              Get more
                            </button>
                          )}
                        </p>
                      )}

                      {/* FOMO message - compact */}
                      <p className="mt-3 text-gray-500 text-xs text-center">
                        Chat visible below
                      </p>
                    </div>
                  </div>
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
            {/* Pinned Menu Preview - always visible when menu is enabled */}
            {menuEnabled && menuItems.length > 0 && (
              <div className="px-3 pt-2 flex-shrink-0">
                <div
                  className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-400/40 cursor-pointer hover:border-pink-400/60 transition-all"
                  onClick={() => setShowMenuModal(true)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                      <List className="w-3 h-3 text-white" />
                    </div>
                    <span className="font-bold text-pink-300 text-xs">Menu</span>
                  </div>
                  <div className="space-y-1 ml-8">
                    {menuItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-white/90 truncate">
                          {item.emoji || '🎁'} {item.label}
                        </span>
                        <span className="text-yellow-400 font-bold ml-2 flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />
                          {item.price}
                        </span>
                      </div>
                    ))}
                  </div>
                  {menuItems.length > 3 && (
                    <div className="text-white/50 text-[10px] ml-8 mt-1">{menuItems.length - 3} more item{menuItems.length - 3 > 1 ? 's' : ''} available...</div>
                  )}
                </div>
              </div>
            )}
            {/* Chat Messages - use more height in landscape mode */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-[35dvh] min-h-[150px] landscape:max-h-[45dvh] landscape:min-h-[120px]"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-4">
                  No messages yet. Be the first to chat!
                </div>
              ) : (
                displayMessages.map((msg) => (
                  msg.messageType === 'tip' ? (
                    <div key={msg.id} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                      {msg.avatarUrl ? (
                        <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center text-[10px] font-bold text-green-900">
                          {msg.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="font-bold text-green-300 text-xs">@{msg.username}</span>
                      <Coins className="w-3 h-3 text-green-400" />
                      <span className="font-bold text-green-400 text-xs">{msg.tipAmount}</span>
                    </div>
                  ) : msg.messageType === 'gift' ? (
                    <div key={msg.id} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
                      {msg.avatarUrl ? (
                        <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-pink-400 flex items-center justify-center text-[10px] font-bold text-pink-900">
                          {msg.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="font-bold text-pink-300 text-xs">@{msg.username}</span>
                      {msg.giftName ? (
                        <>
                          <span className="text-white/70 text-xs">sent</span>
                          {msg.giftQuantity && msg.giftQuantity > 1 && (
                            <span className="font-bold text-pink-400 text-xs">{msg.giftQuantity}x</span>
                          )}
                          <span className="text-base">{msg.giftEmoji}</span>
                          <span className="font-bold text-pink-200 text-xs">{msg.giftName}</span>
                        </>
                      ) : (
                        <span className="text-white/90 text-xs">{msg.content}</span>
                      )}
                    </div>
                  ) : msg.messageType === 'ticket_purchase' ? (
                    <div key={msg.id} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                      {msg.avatarUrl ? (
                        <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-900">
                          {msg.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="font-bold text-amber-300 text-xs">@{msg.username}</span>
                      <span className="text-white/70 text-xs">bought a ticket</span>
                      <Ticket className="w-3 h-3 text-amber-400" />
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-2">
                      {msg.avatarUrl ? (
                        <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover flex-shrink-0" unoptimized />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-pink-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                          {msg.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={`font-bold text-xs ${msg.isCreator ? 'text-yellow-400' : 'text-cyan-300'}`}>
                          @{msg.username}
                        </span>
                        {msg.isCreator && (
                          <span className="ml-1 text-[9px] px-1 py-0.5 bg-yellow-500/30 text-yellow-300 rounded">Creator</span>
                        )}
                        <p className="text-white text-xs break-words">{msg.content}</p>
                      </div>
                    </div>
                  )
                ))
              )}
            </div>

            {/* Mobile Chat Input */}
            <div className="px-3 py-2 border-t border-cyan-400/20 bg-black/60 pb-[calc(60px+env(safe-area-inset-bottom))]">
              {/* Ticketed Mode - Chat disabled for non-ticket holders */}
              {ticketedModeActive && !hasTicket ? (
                <div className="flex items-center justify-center gap-3 py-3">
                  <Ticket className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-300 font-medium">Buy a ticket to chat</span>
                </div>
              ) : currentUser ? (
                userBalance > 0 ? (
                  <div className="space-y-2">
                    {/* Balance indicator */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-white/50">Chat is free for coin holders</span>
                      <button
                        onClick={() => setShowBuyCoinsModal(true)}
                        className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
                      >
                        <Coins className="w-3 h-3" />
                        <span className="font-semibold">{userBalance.toLocaleString()}</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Say something..."
                        disabled={sendingMessage}
                        className="flex-1 px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-full text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 disabled:opacity-50 text-[16px]"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        className="min-w-[48px] min-h-[48px] p-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-full disabled:opacity-50 flex items-center justify-center shadow-lg shadow-cyan-500/30"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 py-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300 font-medium text-sm">Buy coins to chat</span>
                    </div>
                    <button
                      onClick={() => setShowBuyCoinsModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full text-sm shadow-lg"
                    >
                      Get Coins
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 text-sm">
                  <button
                    onClick={() => router.push(`/login?redirect=/live/${streamId}`)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-full shadow-lg"
                  >
                    Sign in
                  </button>{' '}
                  to chat
                </div>
              )}
            </div>
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
                {/* Pinned Menu Preview - always visible when menu is enabled */}
                {menuEnabled && menuItems.length > 0 && (
                  <div className="p-3 flex-shrink-0 border-b border-pink-400/20">
                    <div
                      className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-400/40 cursor-pointer hover:border-pink-400/60 transition-all"
                      onClick={() => setShowMenuModal(true)}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                          <List className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-pink-300">Menu</span>
                      </div>
                      <div className="space-y-2 ml-10">
                        {menuItems.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-white/90 truncate">
                              {item.emoji || '🎁'} {item.label}
                            </span>
                            <span className="text-yellow-400 font-bold ml-3 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              {item.price}
                            </span>
                          </div>
                        ))}
                      </div>
                      {menuItems.length > 3 && (
                        <div className="text-white/50 text-xs ml-10 mt-1">{menuItems.length - 3} more item{menuItems.length - 3 > 1 ? 's' : ''} available...</div>
                      )}
                    </div>
                  </div>
                )}
                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-cyan-500/5 to-transparent"
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10 font-medium">
                      No messages yet. Be the first to chat!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      msg.messageType === 'tip' ? (
                        // Tip message - highlighted
                        <div key={msg.id} className="p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                          <div className="flex items-center gap-2">
                            {msg.avatarUrl ? (
                              <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-xs font-bold">
                                {msg.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="font-bold text-green-300">@{msg.username}</span>
                            <Coins className="w-4 h-4 text-green-400" />
                            <span className="font-bold text-green-400">{msg.tipAmount}</span>
                          </div>
                        </div>
                      ) : msg.messageType === 'gift' ? (
                        // Gift message - highlighted with emoji
                        <div key={msg.id} className="p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                          <div className="flex items-center gap-2">
                            {msg.avatarUrl ? (
                              <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-xs font-bold">
                                {msg.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="font-bold text-pink-300">@{msg.username}</span>
                            {msg.giftName ? (
                              <>
                                <span className="text-white/70">sent</span>
                                {msg.giftQuantity && msg.giftQuantity > 1 && (
                                  <span className="font-bold text-pink-400">{msg.giftQuantity}x</span>
                                )}
                                <span className="text-xl">{msg.giftEmoji}</span>
                                <span className="font-bold text-pink-400">{msg.giftName}</span>
                              </>
                            ) : (
                              <span className="text-white/90">{msg.content}</span>
                            )}
                          </div>
                        </div>
                      ) : msg.messageType === 'ticket_purchase' ? (
                        // Ticket purchase message - highlighted with amber/gold
                        <div key={msg.id} className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                          <div className="flex items-center gap-2">
                            {msg.avatarUrl ? (
                              <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center text-xs font-bold text-black">
                                {msg.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="font-bold text-amber-300">@{msg.username}</span>
                            <span className="text-white/70">bought a ticket</span>
                            <Ticket className="w-4 h-4 text-amber-400" />
                            {msg.ticketPrice && (
                              <>
                                <Coins className="w-3 h-3 text-amber-400" />
                                <span className="font-bold text-amber-400">{msg.ticketPrice}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : msg.messageType === 'menu_purchase' || msg.messageType === 'menu_order' || msg.messageType === 'menu_tip' ? (
                        // Menu item purchase/order - highlighted with purple/pink gradient
                        <div key={msg.id} className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                          <div className="flex items-start gap-2">
                            {msg.avatarUrl ? (
                              <Image src={msg.avatarUrl} alt={msg.username} width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold">
                                {msg.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-purple-300">@{msg.username}</span>
                              <p className="text-sm text-white/90 mt-0.5">{msg.content}</p>
                              {msg.tipAmount && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Coins className="w-3 h-3 text-purple-400" />
                                  <span className="font-bold text-purple-400">{msg.tipAmount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                      // Regular chat message
                      <div key={msg.id} className="flex gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        {msg.avatarUrl ? (
                          <Image
                            src={msg.avatarUrl}
                            alt={msg.username}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-cyan-400/30"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-lg shadow-cyan-500/30">
                            {msg.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                msg.isCreator ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-cyan-100'
                              }`}
                            >
                              @{msg.username}
                            </span>
                            {msg.isCreator && (
                              <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 rounded border border-yellow-400/30 font-semibold">
                                Creator
                              </span>
                            )}
                            {msg.isModerator && (
                              <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 rounded border border-purple-400/30 font-semibold">
                                Mod
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/95 break-words leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                      )
                    ))
                  )}
                </div>

                {/* Message Input - extra padding on mobile for floating gift bar */}
                <div className="p-4 pb-20 lg:pb-4 border-t border-cyan-400/20 bg-gradient-to-r from-cyan-500/5 to-pink-500/5 backdrop-blur-xl">
                  {/* Ticketed Mode - Chat disabled for non-ticket holders */}
                  {ticketedModeActive && !hasTicket ? (
                    <div className="text-center py-3">
                      <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-amber-300 font-medium">
                          <Ticket className="w-4 h-4 inline mr-1" />
                          Buy a ticket to chat
                        </p>
                      </div>
                    </div>
                  ) : currentUser ? (
                    userBalance > 0 ? (
                      <div className="space-y-2">
                        {/* Balance indicator - desktop */}
                        <div className="hidden lg:flex items-center justify-between px-1">
                          <span className="text-xs text-white/50">Chat is free for coin holders</span>
                          <button
                            onClick={() => setShowBuyCoinsModal(true)}
                            className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                          >
                            <Coins className="w-3 h-3" />
                            <span className="font-semibold">{userBalance.toLocaleString()}</span>
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Send a message..."
                            disabled={sendingMessage}
                            className="flex-1 px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 backdrop-blur-sm transition-all text-base"
                          />
                          <button
                            onClick={sendMessage}
                            disabled={!messageInput.trim() || sendingMessage}
                            className="px-4 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm pb-12 lg:pb-0">
                        <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <p className="text-amber-300 font-medium">
                            <Coins className="w-4 h-4 inline mr-1" />
                            Buy coins to chat
                          </p>
                          <button
                            onClick={() => setShowBuyCoinsModal(true)}
                            className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-full text-sm transition-all hover:scale-105"
                          >
                            Get Coins
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-3">
                      <button
                        onClick={() => router.push(`/login?redirect=/live/${streamId}`)}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-full shadow-lg hover:scale-105 transition-all"
                      >
                        Sign in to chat
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Viewer List View */}
            {showViewerList && (
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-cyan-500/5 to-transparent">
                {/* Top Supporters Section */}
                {leaderboard && leaderboard.length > 0 && (
                  <div className="p-4 border-b border-cyan-400/20">
                    <h3 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                      <span className="text-lg">🏆</span> Top Supporters
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.slice(0, 5).map((supporter, index) => (
                        <div
                          key={supporter.id}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border border-gray-400/30' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border border-orange-500/30' :
                            'bg-white/5'
                          }`}
                        >
                          <span className={`text-sm font-bold w-5 ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-orange-400' :
                            'text-white/50'
                          }`}>
                            {index + 1}
                          </span>
                          {supporter.avatarUrl ? (
                            <Image src={supporter.avatarUrl} alt={supporter.username} width={28} height={28} className="w-7 h-7 rounded-full object-cover" unoptimized />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold">
                              {supporter.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-white truncate flex-1">{supporter.username}</span>
                          <div className="flex items-center gap-1 text-xs">
                            <Coins className="w-3 h-3 text-yellow-400" />
                            <span className="text-yellow-400 font-bold">{supporter.totalSpent?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Viewers */}
                <div className="p-4">
                  <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Watching Now
                  </h3>
                  {viewers.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">
                      Loading viewers...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {viewers.map((viewer) => (
                        <div
                          key={viewer.id}
                          className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg transition-all border border-transparent hover:border-cyan-400/20"
                        >
                          {viewer.avatarUrl ? (
                            <img
                              src={viewer.avatarUrl}
                              alt={viewer.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold">
                              {viewer.displayName?.[0] || viewer.username?.[0] || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-white">
                              {viewer.displayName || viewer.username}
                            </div>
                            <div className="text-xs text-white/50 truncate">
                              @{viewer.username}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
        <div className="fixed inset-0 z-[200] bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          <div className="text-center p-8 max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-8">Stream has ended</h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.push(`/${stream?.creator.username}`)}
                className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all text-lg"
              >
                View Creator Profile
              </button>
              <button
                onClick={() => router.push('/watch')}
                className="w-full px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all text-lg"
              >
                Browse Live Streams
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-safe" role="dialog" aria-modal="true" aria-label="Ticketed show announcement">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => {
              // Save the ticketed stream info before dismissing
              setDismissedTicketedStream({
                ticketedStreamId: ticketedAnnouncement.ticketedStreamId,
                title: ticketedAnnouncement.title,
                ticketPrice: ticketedAnnouncement.ticketPrice,
                startsAt: ticketedAnnouncement.startsAt,
              });
              setTicketedAnnouncement(null);
            }}
          />
          {/* Modal */}
          <div className="relative w-full max-w-sm bg-gradient-to-br from-amber-900/95 via-black/98 to-purple-900/95 rounded-2xl border-2 border-amber-500/60 shadow-[0_0_60px_rgba(245,158,11,0.4)] p-6 animate-slideUp">
            {/* Close button */}
            <button
              onClick={() => {
                // Save the ticketed stream info before dismissing
                setDismissedTicketedStream({
                  ticketedStreamId: ticketedAnnouncement.ticketedStreamId,
                  title: ticketedAnnouncement.title,
                  ticketPrice: ticketedAnnouncement.ticketPrice,
                  startsAt: ticketedAnnouncement.startsAt,
                });
                setTicketedAnnouncement(null);
              }}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ticketed Badge */}
            <div className="flex justify-center mb-3">
              <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30">
                <Ticket className="w-4 h-4" />
                PRIVATE STREAM
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {ticketedAnnouncement.title}
            </h3>

            {/* Time */}
            <p className="text-amber-300 text-center text-sm mb-4">
              Starts in {ticketedAnnouncement.minutesUntilStart} minutes
            </p>

            {/* Price + Balance */}
            <div className="flex flex-col items-center gap-1 mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-yellow-400" />
                <span className="text-3xl font-bold text-white">
                  {ticketedAnnouncement.ticketPrice}
                </span>
                <span className="text-gray-400">coins</span>
              </div>
              {currentUser && (
                <p className="text-xs text-gray-400">
                  Your balance: {userBalance} coins
                  {userBalance < ticketedAnnouncement.ticketPrice && (
                    <button
                      onClick={() => setShowBuyCoinsModal(true)}
                      className="ml-2 text-cyan-400 hover:underline"
                    >
                      Get more
                    </button>
                  )}
                </p>
              )}
            </div>

            {/* Buy Button - Instant Purchase */}
            <button
              onClick={() => handleQuickBuyTicket(ticketedAnnouncement.ticketedStreamId, ticketedAnnouncement.ticketPrice)}
              disabled={quickBuyLoading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 rounded-xl font-bold text-black text-lg transition-all hover:scale-105 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quickBuyLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Purchasing...</span>
                </>
              ) : (
                <>
                  <Ticket className="w-5 h-5" />
                  Buy Ticket
                </>
              )}
            </button>

            {/* Dismiss text */}
            <p className="text-center text-gray-500 text-xs mt-3">
              Tap outside to dismiss
            </p>
          </div>
        </div>
      )}

      {/* Simple Quick Buy Modal - for persistent button */}
      {showQuickBuyModal && quickBuyInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Buy ticket">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowQuickBuyModal(false);
              setQuickBuyInfo(null);
            }}
          />
          <div className="relative w-full max-w-xs bg-gradient-to-br from-amber-900/95 via-black/98 to-black/95 rounded-2xl border border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.3)] p-5">
            {/* Close button */}
            <button
              onClick={() => {
                setShowQuickBuyModal(false);
                setQuickBuyInfo(null);
              }}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h3 className="text-lg font-bold text-white text-center mb-1 pr-6">
              {quickBuyInfo.title}
            </h3>

            {/* Countdown */}
            {ticketCountdown && (
              <p className="text-amber-400 text-center text-sm mb-4">
                Starts in {ticketCountdown}
              </p>
            )}

            {/* Price */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <Coins className="w-7 h-7 text-yellow-400" />
              <span className="text-4xl font-bold text-white">{quickBuyInfo.price}</span>
            </div>

            {/* Balance */}
            {currentUser && (
              <p className="text-center text-xs text-gray-400 mb-4">
                Your balance: {userBalance} coins
                {userBalance < quickBuyInfo.price && (
                  <button
                    onClick={() => setShowBuyCoinsModal(true)}
                    className="ml-2 text-cyan-400 hover:underline"
                  >
                    Get more
                  </button>
                )}
              </p>
            )}

            {/* Buy Button */}
            <button
              onClick={() => handleQuickBuyTicket(quickBuyInfo.showId, quickBuyInfo.price)}
              disabled={quickBuyLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl font-bold text-black text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {quickBuyLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Buying...</span>
                </>
              ) : (
                <>
                  <Ticket className="w-5 h-5" />
                  Buy Now
                </>
              )}
            </button>
          </div>
        </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black border border-green-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Purchase Complete!</h3>
              <p className="text-gray-400 mb-4">
                You purchased <span className="text-green-400 font-semibold">{digitalDownload.itemLabel}</span> for {digitalDownload.amount} coins
              </p>
              {isValidDownloadUrl(digitalDownload.url) ? (
                <a
                  href={digitalDownload.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold rounded-xl transition-all mb-3"
                >
                  <Download className="w-5 h-5" />
                  Download Now
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-600 text-gray-300 font-semibold rounded-xl mb-3">
                  <Download className="w-5 h-5" />
                  Download unavailable
                </div>
              )}
              <p className="text-xs text-gray-500 mb-4">
                This link will also be saved in your purchase history
              </p>
              <button
                onClick={() => setDigitalDownload(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
