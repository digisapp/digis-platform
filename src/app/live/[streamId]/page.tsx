'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { streamAnalytics } from '@/lib/utils/analytics';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Volume2, VolumeX, Maximize, Minimize, Users,
  Share2, X, Send, Target, Ticket, Coins, Video, MessageCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import { FloatingGiftBar } from '@/components/streaming/FloatingGiftBar';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { BRBOverlay } from '@/components/live/BRBOverlay';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { useStreamChat } from '@/hooks/useStreamChat';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';

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
  messageType?: 'chat' | 'tip' | 'gift';
  tipAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftQuantity?: number;
}

interface Viewer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
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

  return (
    <VideoTrack
      trackRef={{ participant: broadcaster, publication: videoPublication, source: videoPublication.source }}
      className="w-full h-full object-contain"
    />
  );
}

export default function TheaterModePage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;

  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [streamEnded, setStreamEnded] = useState(false);
  const [showBRB, setShowBRB] = useState(false);

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showViewerList, setShowViewerList] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipNote, setTipNote] = useState('');
  const [completedGoal, setCompletedGoal] = useState<{ title: string; rewardText: string } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Viewers state
  const [viewers, setViewers] = useState<Viewer[]>([]);

  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);

  // Floating gift emojis state
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>>([]);

  // Orientation state for mobile layout
  const [isLandscape, setIsLandscape] = useState(false);

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
  } | null>(null);

  // Upcoming ticketed show from creator (for late-joining viewers)
  const [upcomingTicketedShow, setUpcomingTicketedShow] = useState<{
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
  } | null>(null);

  // VIP mode state (when host activates ticketed stream)
  const [vipModeActive, setVipModeActive] = useState(false);
  const [hasVipTicket, setHasVipTicket] = useState(false);
  const [vipShowInfo, setVipShowInfo] = useState<{
    showId: string;
    showTitle: string;
    ticketPrice: number;
  } | null>(null);

  // Remove completed floating gift
  const removeFloatingGift = useCallback((id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
  }, []);

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
      // Add floating emoji for the gift animation
      if (giftEvent.gift) {
        setFloatingGifts(prev => [...prev, {
          id: `gift-${Date.now()}-${Math.random()}`,
          emoji: giftEvent.gift.emoji,
          rarity: giftEvent.gift.rarity,
          timestamp: Date.now(),
          giftName: giftEvent.gift.name
        }]);

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
      // Add tip message to chat
      setMessages(prev => [...prev, {
        id: `tip-${Date.now()}`,
        userId: tipEvent.senderId,
        username: tipEvent.senderUsername,
        displayName: null,
        avatarUrl: tipEvent.senderAvatarUrl || null,
        content: `tipped ${tipEvent.amount} coins`,
        timestamp: Date.now(),
        messageType: 'tip',
        tipAmount: tipEvent.amount,
      }]);
      // Refresh goals when tip received
      loadStream();
    },
    onGoalUpdate: (update) => {
      // Refresh goals
      loadStream();
      // Show celebration notification if goal completed
      if (update.action === 'completed' && update.goal) {
        setCompletedGoal({
          title: update.goal.title || 'Stream Goal',
          rewardText: update.goal.rewardText || 'Goal reached!',
        });
        // Auto-hide after 5 seconds
        setTimeout(() => setCompletedGoal(null), 5000);
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
    onVipModeChange: async (vipEvent) => {
      if (vipEvent.isActive) {
        // VIP mode started - check if user has ticket
        setVipModeActive(true);
        setVipShowInfo({
          showId: vipEvent.showId!,
          showTitle: vipEvent.showTitle!,
          ticketPrice: vipEvent.ticketPrice!,
        });
        // Check VIP access
        await checkVipAccess();
      } else {
        // VIP mode ended - return to free stream
        setVipModeActive(false);
        setVipShowInfo(null);
        setHasVipTicket(false);
      }
    },
  });

  // Check VIP access for current user
  const checkVipAccess = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/vip`);
      if (response.ok) {
        const data = await response.json();
        setVipModeActive(data.vipActive);
        setHasVipTicket(data.hasAccess);
        if (data.vipActive && data.showId) {
          setVipShowInfo({
            showId: data.showId,
            showTitle: data.showTitle,
            ticketPrice: data.ticketPrice,
          });
        }
      }
    } catch (error) {
      console.error('[VIP] Error checking VIP access:', error);
    }
  };

  // Use real-time viewer count from Ably if available, otherwise use stream data
  const displayViewerCount = realtimeViewerCount > 0 ? realtimeViewerCount : (stream?.currentViewers || 0);

  // Detect orientation for mobile layout
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Load stream data
  useEffect(() => {
    loadStream();
    loadCurrentUser();
    checkVipAccess(); // Check if VIP mode is active
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

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
  useEffect(() => {
    if (!stream || stream.status !== 'live' || streamEnded) return;

    const checkHeartbeat = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/heartbeat`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.shouldAutoEnd) {
          // Stream has exceeded grace period - trigger auto-end
          setShowBRB(false);
          setStreamEnded(true);
          // Call auto-end endpoint to officially end the stream
          fetch(`/api/streams/${streamId}/auto-end`, { method: 'POST' }).catch(() => {});
        } else if (data.isBRB) {
          // Creator disconnected but within grace period
          setShowBRB(true);
        } else {
          // Creator is connected normally
          setShowBRB(false);
        }
      } catch (e) {
        console.error('[Stream] Failed to check heartbeat:', e);
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkHeartbeat, 10000);
    // Also check immediately
    checkHeartbeat();

    return () => clearInterval(interval);
  }, [stream, streamId, streamEnded]);

  // Fetch viewers when viewer list is opened
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

    fetchViewers();
    // Refresh every 10 seconds while open
    const interval = setInterval(fetchViewers, 10000);

    return () => clearInterval(interval);
  }, [showViewerList, streamId]);

  // Viewer heartbeat - keeps viewer active and updates viewer count
  useEffect(() => {
    if (!stream || stream.status !== 'live' || streamEnded || !currentUser) return;

    const sendViewerHeartbeat = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/viewer-heartbeat`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          // Update stream viewer count
          setStream(prev => prev ? {
            ...prev,
            currentViewers: data.currentViewers,
            peakViewers: data.peakViewers,
          } : null);
        }
      } catch (e) {
        console.error('[Stream] Viewer heartbeat failed:', e);
      }
    };

    // Send heartbeat every 30 seconds (stale threshold is 2 minutes)
    const interval = setInterval(sendViewerHeartbeat, 30000);
    // Also send immediately
    sendViewerHeartbeat();

    return () => clearInterval(interval);
  }, [stream?.status, streamId, streamEnded, currentUser]);

  const loadStream = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      if (!response.ok) {
        throw new Error('Stream not found');
      }

      const data = await response.json();
      const streamData = data.stream || data; // Handle both { stream } and direct stream object
      setStream(streamData);

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

  // Handle tip with optional note
  const handleTip = async (amount: number, note?: string) => {
    if (!currentUser) {
      alert('Please sign in to send tips');
      return;
    }

    if (userBalance < amount) {
      alert(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    const idempotencyKey = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ amount, streamId, note: note?.trim() || undefined }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.newBalance);
        streamAnalytics.quickTipSent(streamId, amount);

        // Add tip message to chat immediately (optimistic update)
        const tipMessage: ChatMessage = {
          id: `tip-${Date.now()}-${Math.random()}`,
          userId: currentUser.id,
          username: currentUser.username || 'You',
          displayName: currentUser.displayName || null,
          avatarUrl: currentUser.avatarUrl || null,
          content: `tipped ${amount} coins`,
          timestamp: Date.now(),
          messageType: 'tip',
          tipAmount: amount,
        };
        setMessages(prev => {
          // Avoid duplicate if Ably already added it
          if (prev.some(m => m.messageType === 'tip' && m.userId === currentUser.id && m.tipAmount === amount && Date.now() - m.timestamp < 2000)) {
            return prev;
          }
          return [...prev, tipMessage];
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send tip');
      }
    } catch (error) {
      console.error('[TheaterMode] Error sending tip:', error);
      alert('Failed to send tip');
    }
  };

  // Send gift
  const handleSendGift = async (giftId: string, quantity: number) => {
    if (!currentUser || !stream) {
      throw new Error('Please sign in to send gifts');
    }

    const idempotencyKey = `gift-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
    if (navigator.share) {
      await navigator.share({
        title: stream?.title,
        text: `Watch ${stream?.creator.displayName || stream?.creator.username} live!`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
            onClick={() => router.push('/live')}
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
      {/* Mobile Logo Header - centered */}
      <div className="lg:hidden flex items-center justify-center py-2 bg-black/90 border-b border-cyan-400/30">
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
          {/* Share Button */}
          <button
            onClick={shareStream}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Toggle Chat Button - desktop only since chat is always visible below video on mobile */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`hidden sm:block p-2 rounded-lg transition-colors ${showChat ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10'}`}
            title={showChat ? 'Hide Chat' : 'Show Chat'}
          >
            <Users className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Player Area - centered on desktop when chat is hidden */}
        <div className="flex flex-col bg-gradient-to-b from-black via-gray-900 to-black min-h-0 lg:flex-1 lg:mx-auto">
          {/* Video */}
          <div className="relative aspect-video lg:aspect-auto lg:flex-1">
            {streamEnded ? (
              /* Stream Ended State */
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Stream Has Ended</h2>
                  <p className="text-gray-400 mb-6">Thanks for watching!</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => router.push(`/${stream?.creator.username}`)}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all"
                    >
                      View Creator Profile
                    </button>
                    <button
                      onClick={() => router.push('/live')}
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
                    adaptiveStream: true,
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

                {/* VIP Mode Blocked Screen - covers video when VIP is active and user doesn't have ticket */}
                {vipModeActive && !hasVipTicket && vipShowInfo && (
                  <div className="absolute inset-0 z-50 bg-gradient-to-br from-purple-900/95 via-black/98 to-amber-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
                    {/* VIP Badge */}
                    <div className="mb-4 px-4 py-2 bg-amber-500/20 border border-amber-500 rounded-full flex items-center gap-2 animate-pulse">
                      <Ticket className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-400 font-bold text-sm">VIP STREAM IN SESSION</span>
                    </div>

                    {/* Lock Icon */}
                    <div className="w-20 h-20 mb-6 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                      {vipShowInfo.showTitle}
                    </h2>
                    <p className="text-gray-300 mb-6 text-center max-w-xs">
                      This is a ticketed VIP stream. Purchase a ticket to watch!
                    </p>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-6 px-6 py-3 bg-white/10 rounded-xl border border-white/20">
                      <Coins className="w-6 h-6 text-yellow-400" />
                      <span className="text-2xl font-bold text-white">{vipShowInfo.ticketPrice}</span>
                      <span className="text-gray-400">coins</span>
                    </div>

                    {/* Buy Ticket Button */}
                    <button
                      onClick={() => router.push(`/streams/${vipShowInfo.showId}`)}
                      className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/30 hover:scale-105"
                    >
                      <Ticket className="w-5 h-5 inline mr-2" />
                      Buy Ticket
                    </button>

                    {/* FOMO message */}
                    <p className="mt-6 text-gray-400 text-sm text-center">
                      👀 You can still see the chat below!
                    </p>
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


            {/* Video Controls Overlay - desktop only (mobile users use phone volume/native controls) */}
            <div className="hidden lg:block absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-lg glass-dark hover:bg-white/20 transition-all shadow-lg hover:shadow-cyan-500/20 hover:scale-110"
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
            <h2 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-pink-100 bg-clip-text text-transparent truncate">{stream.title}</h2>
            {stream.description && (
              <p className="text-xs text-white/80 truncate hidden sm:block">{stream.description}</p>
            )}
          </div>

          {/* Mobile Goal Bar - horizontal, below title, above action bar */}
          {stream && stream.goals && stream.goals.length > 0 && !streamEnded && stream.goals.some((g: any) => g.isActive && !g.isCompleted) && (
            <div className="lg:hidden px-3 py-2">
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
            <div className="lg:hidden px-2 py-2 glass-dark border-t border-cyan-400/20 overflow-visible">
              <div className="flex items-center gap-2 overflow-visible">
                {/* Tip Button */}
                {currentUser && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="p-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-xl shadow-lg flex-shrink-0"
                  >
                    <Coins className="w-4 h-4" />
                  </button>
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
            {/* Chat Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
              style={{ maxHeight: 'calc(100vh - 380px)' }}
            >
              {messages.length === 0 ? (
                <div className="text-center text-cyan-300/60 text-xs py-4">
                  No messages yet. Be the first to chat!
                </div>
              ) : (
                [...messages].slice(-50).reverse().map((msg) => (
                  msg.messageType === 'tip' ? (
                    <div key={msg.id} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                      {msg.avatarUrl ? (
                        <img src={msg.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
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
                        <img src={msg.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-pink-400 flex items-center justify-center text-[10px] font-bold text-pink-900">
                          {msg.username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="font-bold text-pink-300 text-xs">@{msg.username}</span>
                      <span className="text-white/70 text-xs">sent</span>
                      {msg.giftQuantity && msg.giftQuantity > 1 && (
                        <span className="font-bold text-pink-400 text-xs">{msg.giftQuantity}x</span>
                      )}
                      <span className="text-base">{msg.giftEmoji}</span>
                    </div>
                  ) : (
                    <div key={msg.id} className="flex gap-2">
                      {msg.avatarUrl ? (
                        <img src={msg.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
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
              {/* VIP Mode - Chat disabled for non-ticket holders */}
              {vipModeActive && !hasVipTicket ? (
                <div className="text-center text-xs py-2">
                  <span className="text-amber-400">
                    <Ticket className="w-3 h-3 inline mr-1" />
                    VIP stream in session - Buy a ticket to chat
                  </span>
                </div>
              ) : currentUser ? (
                userBalance > 0 ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Send a message..."
                      disabled={sendingMessage}
                      className="flex-1 px-3 py-2 bg-white/10 border border-cyan-400/30 rounded-full text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 disabled:opacity-50 text-[16px]"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || sendingMessage}
                      className="p-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-full disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="text-amber-300">
                      <Coins className="w-3 h-3 inline mr-1" />
                      Buy coins to chat
                    </span>
                    <button
                      onClick={() => setShowBuyCoinsModal(true)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full text-xs"
                    >
                      Get Coins
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center text-xs text-white/70">
                  <button
                    onClick={() => router.push(`/login?redirect=/live/${streamId}`)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Sign in
                  </button>{' '}
                  to chat
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Bar - desktop only */}
          <div className="hidden lg:flex px-4 lg:pl-6 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)] items-center justify-start gap-3">
            {/* Send Tip Button - opens modal */}
            <button
              onClick={() => setShowTipModal(true)}
              disabled={!currentUser}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-300/50 flex items-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>Send Tip</span>
            </button>

            {/* Video Call Button */}
            {stream.creatorCallSettings && (
              <RequestCallButton
                creatorId={stream.creator.id}
                creatorName={stream.creator.displayName || stream.creator.username}
                ratePerMinute={stream.creatorCallSettings.callRatePerMinute}
                minimumDuration={stream.creatorCallSettings.minimumCallDuration}
                isAvailable={stream.creatorCallSettings.isAvailableForCalls}
                callType="video"
              />
            )}

            {/* VIP Stream Button - for late-joining viewers or after dismissing popup */}
            {(upcomingTicketedShow || dismissedTicketedStream) && !ticketedAnnouncement && (
              <button
                onClick={() => router.push(`/streams/${upcomingTicketedShow?.id || dismissedTicketedStream?.ticketedStreamId}`)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-300/50 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                <span>VIP Stream</span>
                <span className="text-amber-800">{upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice}</span>
              </button>
            )}

            </div>

          {/* Mobile Gift Bar is now floating - see bottom of page */}

        </div>

        {/* Right Sidebar - Chat & Viewers (Desktop only - mobile uses overlay chat) */}
        {showChat && (
          <div className="hidden lg:flex w-96 glass-dark border-l border-cyan-400/30 flex-col backdrop-blur-2xl shadow-[-4px_0_30px_rgba(34,211,238,0.15)]">
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
                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-cyan-500/5 to-transparent"
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-cyan-300/60 text-sm mt-10 font-medium">
                      No messages yet. Be the first to chat!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      msg.messageType === 'tip' ? (
                        // Tip message - highlighted
                        <div key={msg.id} className="p-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                          <div className="flex items-center gap-2">
                            {msg.avatarUrl ? (
                              <img src={msg.avatarUrl} alt={msg.username} className="w-6 h-6 rounded-full object-cover" />
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
                              <img src={msg.avatarUrl} alt={msg.username} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-xs font-bold">
                                {msg.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="font-bold text-pink-300">@{msg.username}</span>
                            <span className="text-white/70">sent</span>
                            {msg.giftQuantity && msg.giftQuantity > 1 && (
                              <span className="font-bold text-pink-400">{msg.giftQuantity}x</span>
                            )}
                            <span className="text-xl">{msg.giftEmoji}</span>
                            <span className="font-bold text-pink-400">{msg.giftName}</span>
                          </div>
                        </div>
                      ) : (
                      // Regular chat message
                      <div key={msg.id} className="flex gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        {msg.avatarUrl ? (
                          <img
                            src={msg.avatarUrl}
                            alt={msg.username}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-cyan-400/30"
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
                  {/* VIP Mode - Chat disabled for non-ticket holders */}
                  {vipModeActive && !hasVipTicket ? (
                    <div className="text-center py-3">
                      <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-amber-300 font-medium">
                          <Ticket className="w-4 h-4 inline mr-1" />
                          VIP stream in session - Buy a ticket to chat
                        </p>
                      </div>
                    </div>
                  ) : currentUser ? (
                    userBalance > 0 ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Send a message..."
                          disabled={sendingMessage}
                          className="flex-1 px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 backdrop-blur-sm transition-all text-base"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!messageInput.trim() || sendingMessage}
                          className="px-4 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-sm pb-12 lg:pb-0">
                        <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <p className="text-amber-300 font-medium">
                            <Coins className="w-4 h-4 inline mr-1" />
                            Buy coins to chat
                          </p>
                          <button
                            onClick={() => router.push('/wallet')}
                            className="mt-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full text-xs transition-colors"
                          >
                            Get Coins
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-center text-sm text-white/70 pb-12 lg:pb-0">
                      <button
                        onClick={() => router.push(`/login?redirect=/live/${streamId}`)}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors"
                      >
                        Sign in
                      </button>{' '}
                      to chat
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Viewer List View */}
            {showViewerList && (
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-cyan-500/5 to-transparent">
                {viewers.length === 0 ? (
                  <div className="text-center text-cyan-300/60 text-sm mt-10 font-medium">
                    Loading viewers...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewers.map((viewer) => (
                      <div
                        key={viewer.id}
                        className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] border border-transparent hover:border-cyan-400/30"
                      >
                        {viewer.avatarUrl ? (
                          <img
                            src={viewer.avatarUrl}
                            alt={viewer.username}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-400/30"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center font-bold shadow-lg shadow-cyan-500/30">
                            {viewer.displayName?.[0] || viewer.username?.[0] || '?'}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate text-white">
                            {viewer.displayName || viewer.username}
                          </div>
                          <div className="text-xs text-cyan-300/80 truncate font-medium">
                            @{viewer.username}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>


      {/* Desktop Floating Gift Bar */}
      {stream && !streamEnded && (
        <div className="hidden lg:block">
          <FloatingGiftBar
            streamId={streamId}
            creatorId={stream.creator.id}
            onSendGift={handleSendGift}
            userBalance={userBalance}
            isAuthenticated={!!currentUser}
            onAuthRequired={() => router.push(`/login?redirect=/live/${streamId}`)}
            onBuyCoins={() => setShowBuyCoinsModal(true)}
          />
        </div>
      )}

      {/* Desktop Goal Bar Overlay - horizontal at top */}
      {stream && stream.goals && stream.goals.length > 0 && !streamEnded && stream.goals.some((g: any) => g.isActive && !g.isCompleted) && (
        <div className="hidden lg:block fixed top-20 left-1/2 -translate-x-1/2 z-40 w-80">
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
            <h2 className="text-3xl font-bold text-white mb-3">Stream Has Ended</h2>
            <p className="text-gray-400 mb-8 text-lg">Thanks for watching!</p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => router.push(`/${stream?.creator.username}`)}
                className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all text-lg"
              >
                View Creator Profile
              </button>
              <button
                onClick={() => router.push('/live')}
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

      {/* Goal Completed Celebration */}
      {completedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{completedGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{completedGoal.rewardText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Persistent VIP Ticket Button - shows for late-joining viewers or after dismissing popup */}
      {(upcomingTicketedShow || dismissedTicketedStream) && !ticketedAnnouncement && (
        <button
          onClick={() => router.push(`/streams/${upcomingTicketedShow?.id || dismissedTicketedStream?.ticketedStreamId}`)}
          className="lg:hidden fixed top-20 right-3 z-50 px-3 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 rounded-full font-bold text-black text-xs transition-all hover:scale-105 shadow-lg shadow-amber-500/40 flex items-center gap-1.5 animate-bounce"
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>VIP</span>
          <span className="text-amber-800">{upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice}</span>
        </button>
      )}

      {/* Tip Modal with Optional Note */}
      {showTipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-safe">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => {
              setShowTipModal(false);
              setTipAmount('');
              setTipNote('');
            }}
          />
          {/* Modal */}
          <div className="relative w-full max-w-sm bg-gradient-to-br from-cyan-900/95 via-black/98 to-purple-900/95 rounded-2xl border-2 border-cyan-400/60 shadow-[0_0_60px_rgba(34,211,238,0.4)] p-6 animate-slideUp">
            {/* Corner accents - Tron style */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />

            {/* Close button */}
            <button
              onClick={() => {
                setShowTipModal(false);
                setTipAmount('');
                setTipNote('');
              }}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30">
                <Coins className="w-4 h-4" />
                SEND TIP
              </div>
            </div>

            {/* Creator Name */}
            <p className="text-white/80 text-center text-sm mb-4">
              Tip <span className="font-bold text-cyan-300">@{stream?.creator.username}</span>
            </p>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-cyan-300 text-xs font-semibold mb-2">Amount (coins)</label>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="Enter amount..."
                min="1"
                max={userBalance}
                className="w-full px-4 py-3 bg-white/10 border-2 border-cyan-400/40 rounded-xl text-white text-lg font-bold placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all text-center"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mb-4">
              {[10, 50, 100, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(amt.toString())}
                  disabled={userBalance < amt}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                    tipAmount === amt.toString()
                      ? 'bg-cyan-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } ${userBalance < amt ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Private Note Input */}
            <div className="mb-4">
              <label className="block text-cyan-300 text-xs font-semibold mb-1.5">
                Private Note <span className="text-white/40">(optional)</span>
              </label>
              <textarea
                value={tipNote}
                onChange={(e) => setTipNote(e.target.value.slice(0, 200))}
                placeholder="Write a private message..."
                rows={2}
                className="w-full px-3 py-2 bg-white/10 border border-cyan-400/40 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all resize-none text-sm"
              />
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400/70">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Only the creator will see this</span>
                </div>
                <span className="text-xs text-white/40">{tipNote.length}/200</span>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={async () => {
                const amount = parseInt(tipAmount);
                if (amount > 0 && amount <= userBalance) {
                  await handleTip(amount, tipNote || undefined);
                  setShowTipModal(false);
                  setTipAmount('');
                  setTipNote('');
                }
              }}
              disabled={!tipAmount || parseInt(tipAmount) <= 0 || parseInt(tipAmount) > userBalance}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:via-cyan-300 hover:to-cyan-400 rounded-xl font-bold text-black text-lg transition-all hover:scale-105 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Coins className="w-5 h-5" />
              {tipAmount ? `Send ${parseInt(tipAmount).toLocaleString()} Coins` : 'Enter Amount'}
            </button>

            {/* Cancel text */}
            <p className="text-center text-gray-500 text-xs mt-3">
              Tap outside to cancel
            </p>
          </div>
        </div>
      )}

      {/* Ticketed Show Announcement Popup */}
      {ticketedAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-safe">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => {
              // Save the ticketed stream info before dismissing
              setDismissedTicketedStream({
                ticketedStreamId: ticketedAnnouncement.ticketedStreamId,
                title: ticketedAnnouncement.title,
                ticketPrice: ticketedAnnouncement.ticketPrice,
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
                });
                setTicketedAnnouncement(null);
              }}
              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* VIP Badge */}
            <div className="flex justify-center mb-4">
              <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30">
                <Ticket className="w-4 h-4" />
                VIP STREAM
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

            {/* Price */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Coins className="w-6 h-6 text-green-400" />
              <span className="text-3xl font-bold text-green-400">
                {ticketedAnnouncement.ticketPrice}
              </span>
              <span className="text-gray-400">coins</span>
            </div>

            {/* Buy Button */}
            <button
              onClick={() => {
                router.push(`/streams/${ticketedAnnouncement.ticketedStreamId}`);
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 rounded-xl font-bold text-black text-lg transition-all hover:scale-105 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
            >
              <Ticket className="w-5 h-5" />
              Get Ticket
            </button>

            {/* Dismiss text */}
            <p className="text-center text-gray-500 text-xs mt-3">
              Tap outside to dismiss
            </p>
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
    </div>
  );
}
