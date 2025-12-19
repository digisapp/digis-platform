'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftSelector } from '@/components/streaming/GiftSelector';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { StreamPoll } from '@/components/streaming/StreamPoll';
import { StreamCountdown } from '@/components/streaming/StreamCountdown';
import { GuestRequestButton } from '@/components/streaming/GuestRequestButton';
import { GuestVideoOverlay } from '@/components/streaming/GuestVideoOverlay';
import { GuestStreamView } from '@/components/streaming/GuestStreamView';
import { useStreamChat } from '@/hooks/useStreamChat';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
import { createClient } from '@/lib/supabase/client';
import {
  Volume2, VolumeX, Maximize, Minimize, Users, Heart, Share2,
  MessageCircle, Gift, ChevronDown, ChevronUp, X, Coins, Crown,
  Zap, Eye, TrendingUp, ExternalLink, Star, Ticket, Video, Phone
} from 'lucide-react';
import type { Stream, StreamMessage, VirtualGift, StreamGift, StreamGoal } from '@/db/schema';
import { useToastContext } from '@/context/ToastContext';

type StreamWithCreator = Stream & {
  creator?: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl?: string | null;
  };
  orientation?: 'landscape' | 'portrait';
};

// Featured creator info
type FeaturedCreator = {
  id: string;
  creatorId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  isSpotlighted: boolean;
  tipsReceived: number;
};

// Creator call settings
type CreatorCallSettings = {
  callRatePerMinute: number;
  minimumCallDuration: number;
  voiceCallRatePerMinute: number;
  minimumVoiceCallDuration: number;
  isAvailableForCalls: boolean;
  isAvailableForVoiceCalls: boolean;
};

// Component to display only the broadcaster's video
function BroadcasterVideo() {
  const participants = useRemoteParticipants();

  // Find the first participant with a camera track (the broadcaster)
  const broadcaster = participants.find(p => {
    const cameraTrack = p.getTrackPublication(Track.Source.Camera);
    return cameraTrack && cameraTrack.track;
  });

  if (!broadcaster) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white/60">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  const cameraTrack = broadcaster.getTrackPublication(Track.Source.Camera);

  if (!cameraTrack || !cameraTrack.track) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white/60">Waiting for broadcaster...</p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={{ participant: broadcaster, source: Track.Source.Camera, publication: cameraTrack }}
      className="h-full w-full object-contain"
    />
  );
}

export default function StreamViewerPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const streamId = params.streamId as string;
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Stream state
  const [stream, setStream] = useState<StreamWithCreator | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [accessDenied, setAccessDenied] = useState<{
    reason: string;
    creatorId?: string;
    creatorUsername?: string;
    requiresSubscription?: boolean;
    requiresFollow?: boolean;
    requiresTicket?: boolean;
    ticketPrice?: number;
  } | null>(null);
  const [isPurchasingTicket, setIsPurchasingTicket] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);

  // User state
  const [userBalance, setUserBalance] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Stream stats
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
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

  // Call request state
  const [creatorCallSettings, setCreatorCallSettings] = useState<CreatorCallSettings | null>(null);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const [isRequestingCall, setIsRequestingCall] = useState(false);
  const [callRequestError, setCallRequestError] = useState<string | null>(null);

  // UI state
  const [isMuted, setIsMuted] = useState(true); // Start muted (browser requirement)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Guest call-in state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [guestRequestsEnabled, setGuestRequestsEnabled] = useState(false);
  const [isGuest, setIsGuest] = useState(false); // Am I the active guest?
  const [activeGuest, setActiveGuest] = useState<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    requestType: 'video' | 'voice';
  } | null>(null);

  // Animations
  const [giftAnimations, setGiftAnimations] = useState<Array<{ gift: VirtualGift; streamGift: StreamGift }>>([]);
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number }>>([]);

  // Check mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current user ID for guest features
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch all data
  useEffect(() => {
    fetchStreamDetails();
    fetchMessages();
    fetchLeaderboard();
    fetchUserBalance();
    fetchGoals();
    fetchFeaturedCreators();
    fetchPoll();
    fetchCountdown();
  }, [streamId]);

  // Check follow status when stream loads
  useEffect(() => {
    if (stream?.creator?.id) {
      fetchFollowStatus();
      fetchCreatorCallSettings(stream.creator.id);
    }
  }, [stream?.creator?.id]);

  // Join stream and setup real-time
  useEffect(() => {
    if (stream && !isJoined) {
      joinStream();
    }
    return () => {
      if (isJoined) leaveStream();
    };
  }, [stream, isJoined]);

  // Auto-leave stream on browser close/navigation
  useEffect(() => {
    if (!isJoined) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery during page unload
      const url = `/api/streams/${streamId}/leave`;
      const success = navigator.sendBeacon(url);
      if (!success) {
        // Fallback to fetch if sendBeacon fails
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isJoined, streamId]);

  // Setup real-time subscriptions with Ably
  const { viewerCount: ablyViewerCount } = useStreamChat({
    streamId,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message as unknown as StreamMessage]);
    },
    onTip: (tipData) => {
      // Add floating coin emoji for tips with dedicated tip sound
      if (tipData.amount) {
        setFloatingGifts(prev => [...prev, {
          id: `tip-${Date.now()}-${Math.random()}`,
          emoji: '💰',
          rarity: 'tip', // Uses dedicated coin jingling sound
          timestamp: Date.now()
        }]);
      }
      fetchLeaderboard();
    },
    onGift: (giftEvent) => {
      setGiftAnimations((prev) => [...prev, {
        gift: giftEvent.gift as unknown as VirtualGift,
        streamGift: giftEvent.streamGift as unknown as StreamGift
      }]);
      // Add floating emoji for the gift
      if (giftEvent.gift) {
        setFloatingGifts(prev => [...prev, {
          id: `gift-${Date.now()}-${Math.random()}`,
          emoji: giftEvent.gift.emoji,
          rarity: giftEvent.gift.rarity,
          timestamp: Date.now()
        }]);
      }
      fetchLeaderboard();
      fetchGoals();
    },
    onViewerCount: (data) => {
      setViewerCount(data.currentViewers);
      setPeakViewers(data.peakViewers);
    },
    onStreamEnded: () => {
      setStreamEnded(true);
    },
    onGoalUpdate: () => {
      // Refresh goals when host creates, updates, or completes a goal
      fetchGoals();
    },
    onSpotlightChanged: (event) => {
      // Update featured creators when spotlight changes
      if (event.spotlightedCreator) {
        setFeaturedCreators(prev => prev.map(c => ({
          ...c,
          isSpotlighted: c.creatorId === event.spotlightedCreator?.creatorId,
        })));
      } else {
        // Un-spotlight all
        setFeaturedCreators(prev => prev.map(c => ({
          ...c,
          isSpotlighted: false,
        })));
      }
    },
    onPollUpdate: (event) => {
      // Refresh poll when host creates or updates a poll
      if (event.action === 'created' || event.action === 'updated') {
        setActivePoll(event.poll);
      } else if (event.action === 'ended') {
        setActivePoll(null);
      }
    },
    onCountdownUpdate: (event) => {
      // Refresh countdown when host creates or cancels a countdown
      if (event.action === 'created') {
        setActiveCountdown(event.countdown);
      } else if (event.action === 'cancelled' || event.action === 'ended') {
        setActiveCountdown(null);
      }
    },
    // Guest call-in events
    onGuestAccepted: (event) => {
      // Check if this viewer's request was accepted
      if (event.userId === currentUserId) {
        setIsGuest(true);
        setActiveGuest({
          userId: event.userId,
          username: event.username,
          displayName: event.displayName,
          avatarUrl: event.avatarUrl,
          requestType: event.requestType,
        });
      }
    },
    onGuestJoined: (event) => {
      // Update active guest for all viewers when guest joins
      setActiveGuest({
        userId: event.userId,
        username: event.username,
        displayName: event.displayName,
        avatarUrl: null,
        requestType: event.requestType,
      });
    },
    onGuestRemoved: () => {
      // Clear active guest for all viewers
      setActiveGuest(null);
      // If I was the guest, reset my guest status
      setIsGuest(false);
    },
    onGuestRequestsToggle: (event) => {
      setGuestRequestsEnabled(event.enabled);
    },
  });

  // Update viewer count from Ably presence
  useEffect(() => {
    if (ablyViewerCount > 0) {
      setViewerCount(ablyViewerCount);
    }
  }, [ablyViewerCount]);

  // Poll for active poll vote updates (every 5 seconds)
  useEffect(() => {
    if (!activePoll?.isActive) return;

    const interval = setInterval(fetchPoll, 5000);
    return () => clearInterval(interval);
  }, [activePoll?.isActive, streamId]);

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    if (showControls) {
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
    }
    return () => { if (controlsTimeout) clearTimeout(controlsTimeout); };
  }, [showControls]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
        // Set guest requests enabled from stream data
        setGuestRequestsEnabled(data.stream.guestRequestsEnabled || false);
        // Check if there's an active guest already
        if (data.stream.activeGuestId) {
          // Fetch active guest details
          try {
            const guestRes = await fetch(`/api/streams/${streamId}/guest`);
            const guestData = await guestRes.json();
            if (guestRes.ok && guestData.activeGuest) {
              setActiveGuest(guestData.activeGuest);
            }
          } catch (err) {
            console.error('Error fetching active guest:', err);
          }
        }
      } else if (data.accessDenied) {
        setAccessDenied({
          reason: data.error,
          creatorId: data.creatorId,
          creatorUsername: data.creatorUsername,
          requiresSubscription: data.requiresSubscription,
          requiresFollow: data.requiresFollow,
          requiresTicket: data.requiresTicket,
          ticketPrice: data.ticketPrice,
        });
        // Fetch balance for ticket purchase
        if (data.requiresTicket) {
          fetchUserBalance();
        }
      } else {
        setError(data.error || 'Stream not found');
      }
    } catch (err) {
      setError('Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetchWithRetry(`/api/streams/${streamId}/messages`, { retries: 3, backoffMs: 1000 });
      const data = await response.json();
      if (response.ok) setMessages(data.messages.reverse());
    } catch (err) {
      if (isOnline()) console.error('Error fetching messages:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetchWithRetry(`/api/streams/${streamId}/leaderboard`, { retries: 3, backoffMs: 1000 });
      const data = await response.json();
      if (response.ok) setLeaderboard(data.leaderboard);
    } catch (err) {
      if (isOnline()) console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) setUserBalance(data.balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetchWithRetry(`/api/streams/${streamId}/goals`, { retries: 3, backoffMs: 1000 });
      const data = await response.json();
      if (response.ok) setGoals(data.goals);
    } catch (err) {
      if (isOnline()) console.error('Error fetching goals:', err);
    }
  };

  const fetchPoll = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/polls`);
      const data = await response.json();
      if (response.ok) setActivePoll(data.poll);
    } catch (err) {
      if (isOnline()) console.error('Error fetching poll:', err);
    }
  };

  const fetchCountdown = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/countdown`);
      const data = await response.json();
      if (response.ok) setActiveCountdown(data.countdown);
    } catch (err) {
      if (isOnline()) console.error('Error fetching countdown:', err);
    }
  };

  const fetchFeaturedCreators = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/featured`);
      const data = await response.json();
      if (response.ok) setFeaturedCreators(data.featuredCreators || []);
    } catch (err) {
      console.error('Error fetching featured creators:', err);
    }
  };

  const fetchCreatorCallSettings = async (creatorId: string) => {
    try {
      const response = await fetch(`/api/creators/${creatorId}/call-settings`);
      const data = await response.json();
      if (response.ok) {
        setCreatorCallSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching creator call settings:', err);
    }
  };

  const fetchFollowStatus = async () => {
    if (!stream?.creator?.id) return;
    try {
      const response = await fetch(`/api/creators/${stream.creator.id}/follow`);
      const data = await response.json();
      setIsFollowing(data.isFollowing);
    } catch (err) {
      console.error('Error fetching follow status:', err);
    }
  };

  const joinStream = async () => {
    try {
      await fetch(`/api/streams/${streamId}/join`, { method: 'POST' });
      const tokenResponse = await fetch(`/api/streams/${streamId}/token`);
      const tokenData = await tokenResponse.json();
      if (tokenResponse.ok) {
        setToken(tokenData.token);
        setServerUrl(tokenData.serverUrl);
        setIsJoined(true);
      }
    } catch (err) {
      console.error('Error joining stream:', err);
      setError('Failed to join stream');
    }
  };

  const leaveStream = async () => {
    try {
      await fetch(`/api/streams/${streamId}/leave`, { method: 'POST' });
    } catch (err) {
      console.error('Error leaving stream:', err);
    }
  };

  const handleSendMessage = async (message: string) => {
    // Optimistic update - add message immediately with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      streamId,
      userId: 'current-user',
      username: 'You', // Will be replaced by real data from broadcast
      message: message,
      messageType: 'chat' as const,
      giftId: null,
      giftAmount: null,
      tipMenuItemId: null,
      tipMenuItemLabel: null,
      isAiGenerated: false,
      createdAt: new Date(),
    };

    // Add optimistically
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) {
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      // The real message will come through the broadcast and replace/add to the list
      // Remove the optimistic message since the broadcast will add the real one
      const responseData = await response.json();
      if (responseData.message?.id) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw error;
    }
  };

  const handleSendGift = async (giftId: string, quantity: number, recipientCreatorId?: string, recipientUsername?: string) => {
    const response = await fetch(`/api/streams/${streamId}/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId, quantity, recipientCreatorId, recipientUsername }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send gift');
    }
    fetchUserBalance();
  };

  const handleSendTip = async (amount: number, recipientCreatorId?: string, recipientUsername?: string) => {
    const response = await fetch(`/api/streams/${streamId}/tip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, recipientCreatorId, recipientUsername }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send tip');
    }
    fetchUserBalance();
  };

  const handleRequestCall = async (callType: 'video' | 'voice') => {
    if (!stream?.creator?.id || isRequestingCall) return;

    setIsRequestingCall(true);
    setCallRequestError(null);

    try {
      const response = await fetch('/api/calls/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: stream.creator.id,
          callType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCallRequestModal(false);
        // Redirect to the call page
        router.push(`/calls/${data.call.id}`);
      } else {
        setCallRequestError(data.error || 'Failed to request call');
      }
    } catch (err) {
      setCallRequestError('Failed to request call. Please try again.');
    } finally {
      setIsRequestingCall(false);
    }
  };

  // Get the spotlighted creator (if any)
  const spotlightedCreator = featuredCreators.find(c => c.isSpotlighted) || null;

  const handleFollowToggle = async () => {
    if (!stream?.creator?.id || followLoading) return;
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/creators/${stream.creator.id}/follow`, { method });
      if (response.ok) setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const removeFloatingGift = useCallback((id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
  }, []);

  const removeGiftAnimation = (index: number) => {
    setGiftAnimations((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const videos = document.querySelectorAll('video');
    videos.forEach(v => v.muted = !isMuted);
  };

  const shareStream = async () => {
    const url = window.location.href;
    const text = `Watch ${stream?.creator?.username} live on Digis!`;
    if (navigator.share) {
      await navigator.share({ title: stream?.title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      showSuccess('Link copied!');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center md:pl-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Joining stream...</p>
        </div>
      </div>
    );
  }

  // Handle ticket purchase
  const handlePurchaseTicket = async () => {
    if (isPurchasingTicket || !accessDenied?.ticketPrice) return;

    setIsPurchasingTicket(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/ticket`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        // Ticket purchased successfully - reload to get access
        setAccessDenied(null);
        setLoading(true);
        fetchStreamDetails();
      } else {
        showError(data.error || 'Failed to purchase ticket');
      }
    } catch (err) {
      showError('Failed to purchase ticket. Please try again.');
    } finally {
      setIsPurchasingTicket(false);
    }
  };

  // Access denied state
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 md:pl-20">
        <div className="max-w-md w-full text-center glass rounded-3xl p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-digis-pink/20 to-digis-cyan/20 flex items-center justify-center">
            <span className="text-4xl">{accessDenied.requiresTicket ? '🎟️' : '🔒'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {accessDenied.requiresTicket ? 'Ticket Required' : 'Access Required'}
          </h1>
          <p className="text-gray-400 mb-6">{accessDenied.reason}</p>

          {/* Ticket Purchase UI */}
          {accessDenied.requiresTicket && accessDenied.ticketPrice && (
            <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Ticket className="w-6 h-6 text-amber-400" />
                <span className="text-xl font-bold text-amber-400">{accessDenied.ticketPrice} coins</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
                <span>Your balance:</span>
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className={userBalance >= accessDenied.ticketPrice ? 'text-green-400' : 'text-red-400'}>
                  {userBalance.toLocaleString()} coins
                </span>
              </div>

              {userBalance >= accessDenied.ticketPrice ? (
                <GlassButton
                  variant="gradient"
                  size="lg"
                  shimmer
                  glow
                  onClick={handlePurchaseTicket}
                  disabled={isPurchasingTicket}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  {isPurchasingTicket ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Ticket className="w-5 h-5 mr-2" />
                      Buy Ticket
                    </>
                  )}
                </GlassButton>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-400">You need {accessDenied.ticketPrice - userBalance} more coins</p>
                  <GlassButton
                    variant="gradient"
                    size="lg"
                    shimmer
                    glow
                    onClick={() => router.push('/wallet')}
                    className="w-full"
                  >
                    <Coins className="w-5 h-5 mr-2" />
                    Get Coins
                  </GlassButton>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {accessDenied.requiresSubscription && (
              <GlassButton variant="gradient" size="lg" shimmer glow onClick={() => router.push(`/${accessDenied.creatorUsername}`)} className="w-full">
                Subscribe to Watch
              </GlassButton>
            )}
            {accessDenied.requiresFollow && (
              <GlassButton variant="gradient" size="lg" shimmer glow onClick={() => router.push(`/${accessDenied.creatorUsername}`)} className="w-full">
                Follow to Watch
              </GlassButton>
            )}
            <GlassButton variant="ghost" size="lg" onClick={() => router.push('/live')} className="w-full">
              Browse Other Streams
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !stream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 md:pl-20">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-4">{error || 'Stream not found'}</h1>
          <GlassButton variant="gradient" onClick={() => router.push('/live')} shimmer>
            Browse Live Streams
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white md:pl-20">
      {/* Guest Stream View - Shows when viewer is the active guest */}
      {isGuest && activeGuest?.userId === currentUserId && (
        <GuestStreamView
          streamId={streamId}
          requestType={activeGuest.requestType}
          onLeave={() => setIsGuest(false)}
        />
      )}

      {/* Emoji Reactions Overlay */}
      <GiftFloatingEmojis gifts={floatingGifts} onComplete={removeFloatingGift} />

      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={giftAnimations} onRemove={removeGiftAnimation} />

      {/* Main Layout - Mobile: video + chat stacked, Desktop: video + sidebar */}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Video Section */}
        <div className={`${isMobile ? 'h-[45vh]' : 'flex-1'} flex flex-col ${showChat && !isMobile ? 'lg:mr-[400px]' : ''}`}>
          {/* Video Player Container */}
          <div
            ref={videoContainerRef}
            className="relative flex-1 bg-black flex items-center justify-center"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={() => isMobile && setShowControls(!showControls)}
          >
            {/* LiveKit Video - Shows only the broadcaster */}
            {token && serverUrl ? (
              <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={serverUrl}
                className="h-full w-full flex items-center justify-center"
                options={{ adaptiveStream: true, dynacast: true }}
              >
                <BroadcasterVideo />
                <RoomAudioRenderer />
              </LiveKitRoom>
            ) : (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* Video Overlay - Top Gradient */}
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />


            {/* Top Bar - Creator Info & Stats */}
            <div className={`absolute top-0 left-0 right-0 p-4 flex items-start justify-between transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              {/* Mobile Logo + Creator Info */}
              <div className="flex items-center gap-3">
                {/* Digis Logo - Mobile Only */}
                <button
                  onClick={() => router.push('/')}
                  className="lg:hidden flex-shrink-0"
                >
                  <Image
                    src="/logo.png"
                    alt="Digis"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </button>

                {/* Creator Avatar */}
                <button
                  onClick={() => router.push(`/${stream.creator?.username}`)}
                  className="relative group"
                >
                  {stream.creator?.avatarUrl ? (
                    <img src={stream.creator.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500 ring-offset-2 ring-offset-black" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold ring-2 ring-red-500 ring-offset-2 ring-offset-black">
                      {stream.creator?.username?.[0] || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{stream.creator?.username}</span>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-md animate-pulse">LIVE</span>
                  </div>
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`mt-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      isFollowing
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'bg-digis-pink text-white hover:scale-105'
                    }`}
                  >
                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-full">
                  <Eye className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-bold">{viewerCount.toLocaleString()}</span>
                </div>
                <button
                  onClick={shareStream}
                  className="p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                {/* Guest Request Button */}
                <GuestRequestButton
                  streamId={streamId}
                  guestRequestsEnabled={guestRequestsEnabled}
                  isHost={false}
                  onRequestAccepted={() => setIsGuest(true)}
                />
                {!isMobile && (
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className={`p-2 rounded-full transition-colors ${showChat ? 'bg-digis-cyan text-black' : 'bg-black/60 backdrop-blur-sm hover:bg-white/20'}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Goal Bar - Premium Animated Design */}
            {/* On mobile: positioned at bottom above controls. On desktop: top below creator info */}
            {goals.length > 0 && goals.some(g => g.isActive && !g.isCompleted) && (
              <div className="absolute bottom-24 md:bottom-auto md:top-20 left-4 right-4 z-30">
                {goals.filter(g => g.isActive && !g.isCompleted).slice(0, 1).map(goal => {
                  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  const isAlmostComplete = progress >= 80;
                  const isHalfway = progress >= 50;

                  return (
                    <div
                      key={goal.id}
                      className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
                        isAlmostComplete
                          ? 'border-yellow-400/50 bg-gradient-to-r from-yellow-900/40 via-orange-900/40 to-yellow-900/40'
                          : 'border-cyan-500/30 bg-gradient-to-r from-black/80 via-cyan-950/40 to-black/80'
                      }`}
                    >
                      {/* Animated background shimmer */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div
                          className={`absolute inset-0 opacity-30 ${
                            isAlmostComplete ? 'bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent'
                          }`}
                          style={{
                            animation: 'shimmer 2s infinite',
                            transform: 'translateX(-100%)',
                          }}
                        />
                      </div>

                      <div className="relative p-4">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* Animated Goal Icon */}
                            <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${
                              isAlmostComplete
                                ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30'
                                : 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                            }`}>
                              <span className="text-xl">{isAlmostComplete ? '🔥' : '🎯'}</span>
                              {isAlmostComplete && (
                                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl blur opacity-50 animate-pulse" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-sm md:text-base">{goal.title}</h3>
                              {goal.rewardText && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <span>🎁</span> {goal.rewardText}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress Numbers */}
                          <div className="text-right">
                            <div className={`text-lg md:text-xl font-black ${
                              isAlmostComplete ? 'text-yellow-400' : 'text-cyan-400'
                            }`}>
                              {goal.currentAmount.toLocaleString()}
                              <span className="text-white/60 text-sm font-medium">/{goal.targetAmount.toLocaleString()}</span>
                            </div>
                            <div className={`text-xs font-bold ${
                              isAlmostComplete ? 'text-yellow-300' : 'text-cyan-300'
                            }`}>
                              {progress.toFixed(0)}% Complete
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="relative h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                          {/* Background grid pattern */}
                          <div className="absolute inset-0 opacity-20"
                            style={{
                              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)'
                            }}
                          />

                          {/* Progress Fill */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                              isAlmostComplete
                                ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-400'
                                : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          >
                            {/* Shine effect on fill */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                            {/* Animated pulse at the end */}
                            <div
                              className={`absolute right-0 top-0 bottom-0 w-8 ${
                                isAlmostComplete
                                  ? 'bg-gradient-to-r from-transparent to-yellow-300/50'
                                  : 'bg-gradient-to-r from-transparent to-cyan-300/50'
                              } animate-pulse`}
                            />
                          </div>

                          {/* Milestone markers */}
                          <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
                            {[25, 50, 75].map(milestone => (
                              <div
                                key={milestone}
                                className={`w-0.5 h-2 rounded-full transition-colors ${
                                  progress >= milestone ? 'bg-white/60' : 'bg-white/20'
                                }`}
                                style={{ marginLeft: `${milestone - 1}%` }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Bottom motivational text */}
                        {isAlmostComplete && (
                          <div className="mt-2 text-center">
                            <span className="text-xs text-yellow-300 font-bold animate-pulse">
                              Almost there! Keep going! 🚀
                            </span>
                          </div>
                        )}
                        {isHalfway && !isAlmostComplete && (
                          <div className="mt-2 text-center">
                            <span className="text-xs text-cyan-300 font-medium">
                              Halfway there! 💪
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Username Watermark - Hidden when stream ends */}
            {!streamEnded && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                <span
                  className="text-xl sm:text-2xl font-extrabold tracking-wide whitespace-nowrap text-white drop-shadow-lg"
                  style={{
                    fontFamily: 'Poppins, "SF Pro Display", system-ui, sans-serif',
                    WebkitTextStroke: '1px #ff1493',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8), 1.5px 1.5px 0 #ff1493, -1.5px -1.5px 0 #ff1493, 1.5px -1.5px 0 #ff1493, -1.5px 1.5px 0 #ff1493',
                  }}
                >
                  digis.cc/{stream?.creator?.username || 'loading'}
                </span>
              </div>
            )}

            {/* Guest Video Overlay - Shows when a guest is active */}
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

            {/* Spotlight Card - Shows when a creator is spotlighted (Desktop) */}
            {spotlightedCreator && !isMobile && (
              <div className="absolute bottom-28 left-4 z-40 animate-in slide-in-from-left duration-500">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                  {/* Animated glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse" />

                  {/* Avatar with ring */}
                  <div className="relative">
                    {spotlightedCreator.avatarUrl ? (
                      <img
                        src={spotlightedCreator.avatarUrl}
                        alt={spotlightedCreator.username}
                        className="w-14 h-14 rounded-full object-cover ring-4 ring-yellow-500 shadow-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center ring-4 ring-yellow-500">
                        <span className="text-2xl font-bold text-white">
                          {spotlightedCreator.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    {/* Spotlight icon */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                      <Star className="w-4 h-4 text-black fill-black" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">✨ Now Featured</span>
                    </div>
                    <h3 className="font-bold text-white text-lg">
                      {spotlightedCreator.username}
                    </h3>
                    <p className="text-sm text-gray-300">@{spotlightedCreator.username}</p>
                  </div>

                  {/* Tip Button */}
                  <button
                    onClick={() => setShowGiftPanel(true)}
                    className="relative ml-2 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-bold text-black hover:scale-105 transition-transform shadow-lg shadow-yellow-500/30"
                  >
                    <Coins className="w-5 h-5" />
                    <span>Tip</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Poll Overlay */}
            {activePoll && activePoll.isActive && (
              <div className="absolute bottom-20 left-3 z-40 w-[220px] sm:w-[260px]">
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

            {/* Bottom Controls */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Stream Title */}
              <h1 className="text-lg md:text-xl font-bold text-white mb-3 line-clamp-1">{stream.title}</h1>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-4">
                {/* Left: Audio Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-3 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                {/* Right: Gift & Fullscreen */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGiftPanel(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-digis-pink to-digis-purple rounded-full font-bold text-sm hover:scale-105 transition-transform"
                  >
                    <Gift className="w-4 h-4" />
                    <span className="hidden sm:inline">Send Gift</span>
                  </button>
                  {/* Call Request Button - Only show if creator is available for calls */}
                  {creatorCallSettings && (creatorCallSettings.isAvailableForCalls || creatorCallSettings.isAvailableForVoiceCalls) && (
                    <button
                      onClick={() => setShowCallRequestModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                    >
                      <Video className="w-4 h-4" />
                      <span className="hidden sm:inline">Call</span>
                    </button>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="p-3 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Mobile: Inline Chat & Actions Below Video */}
          {isMobile && (
            <div className="h-[55vh] flex flex-col bg-black/95 border-t border-white/10 overflow-hidden">
              {/* Mobile Action Bar */}
              <div className="border-b border-white/10 bg-black/60 flex-shrink-0">
                {/* Top Row: Creator Info & Buttons */}
                <div className="flex items-center justify-between p-2">
                  {/* Stream Info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button onClick={() => router.push(`/${stream.creator?.username}`)} className="flex-shrink-0">
                      {stream.creator?.avatarUrl ? (
                        <img src={stream.creator.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-red-500" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold ring-2 ring-red-500">
                          {stream.creator?.username?.[0] || '?'}
                        </div>
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{stream.creator?.username}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400 font-bold">● LIVE</span>
                        <span className="text-xs text-gray-400">{viewerCount} watching</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowGiftPanel(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-digis-pink to-digis-purple rounded-full text-xs font-bold"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Gift
                    </button>
                    {creatorCallSettings && (creatorCallSettings.isAvailableForCalls || creatorCallSettings.isAvailableForVoiceCalls) && (
                      <button
                        onClick={() => setShowCallRequestModal(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-xs font-bold"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Call
                      </button>
                    )}
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                        isFollowing ? 'bg-white/20' : 'bg-digis-cyan'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Top Gifters (if any) */}
                {leaderboard.length > 0 && (
                  <div className="px-2 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <span className="text-xs text-yellow-400 flex items-center gap-1 flex-shrink-0">
                      <Crown className="w-3 h-3" />
                      Top:
                    </span>
                    {leaderboard.slice(0, 3).map((entry, index) => (
                      <div key={entry.senderId} className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full flex-shrink-0">
                        <span className={`text-xs font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'}`}>
                          {index === 0 ? '👑' : `#${index + 1}`}
                        </span>
                        <span className="text-xs text-white truncate max-w-[60px]">{entry.senderUsername}</span>
                        <span className="text-xs text-digis-cyan">{entry.totalCoins}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mobile Spotlight Card */}
                {spotlightedCreator && (
                  <div className="px-2 pb-2">
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {spotlightedCreator.avatarUrl ? (
                          <img
                            src={spotlightedCreator.avatarUrl}
                            alt={spotlightedCreator.username}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-yellow-500"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center ring-2 ring-yellow-500">
                            <span className="text-sm font-bold text-white">
                              {spotlightedCreator.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Star className="w-2.5 h-2.5 text-black fill-black" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-yellow-400 uppercase">✨ Featured</span>
                        </div>
                        <p className="font-bold text-white text-sm truncate">
                          {spotlightedCreator.username}
                        </p>
                      </div>

                      {/* Tip Button */}
                      <button
                        onClick={() => setShowGiftPanel(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-bold text-xs text-black"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Tip
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Chat - Always Visible */}
              <div className="flex-1 overflow-hidden">
                <StreamChat
                  streamId={streamId}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                />
              </div>
            </div>
          )}

          {/* Below Video - Desktop Only */}
          {!isMobile && (
            <div className="p-4 bg-black/40 border-t border-white/10">
              <div className="flex items-center justify-between">
                {/* Stream Info */}
                <div className="flex items-center gap-4">
                  {stream.description && (
                    <p className="text-sm text-gray-400 line-clamp-1 max-w-md">{stream.description}</p>
                  )}
                </div>

                {/* Wallet Balance */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-yellow-400">{userBalance.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">coins</span>
                </div>
              </div>

              {/* Top Gifters Row */}
              {leaderboard.length > 0 && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span>Top Gifters:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {leaderboard.slice(0, 5).map((entry, index) => (
                      <div key={entry.senderId} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                        <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                          #{index + 1}
                        </span>
                        <span className="text-sm text-white">{entry.senderUsername}</span>
                        <span className="text-xs text-digis-cyan">{entry.totalCoins}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Sidebar - Desktop */}
        {showChat && !isMobile && (
          <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-black/95 border-l border-white/10 flex flex-col z-40">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-digis-cyan" />
                <span className="font-bold">Live Chat</span>
                <span className="text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">{messages.length}</span>
              </div>
              <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <StreamChat
                streamId={streamId}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        )}


        {/* Gift Panel */}
        {showGiftPanel && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowGiftPanel(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[500px]">
              <div className="bg-black/95 backdrop-blur-xl rounded-t-3xl lg:rounded-3xl border border-white/20 p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Send a Gift</h3>
                    <p className="text-sm text-gray-400">Support {stream.creator?.username}</p>
                  </div>
                  <button onClick={() => setShowGiftPanel(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-6">
                  <span className="text-gray-400">Your Balance</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-400">{userBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Gift Selector Inline */}
                <GiftSelector
                  streamId={streamId}
                  onSendGift={async (giftId, qty, recipientCreatorId, recipientUsername) => {
                    await handleSendGift(giftId, qty, recipientCreatorId, recipientUsername);
                    setShowGiftPanel(false);
                  }}
                  onSendTip={async (amount, recipientCreatorId, recipientUsername) => {
                    await handleSendTip(amount, recipientCreatorId, recipientUsername);
                    setShowGiftPanel(false);
                  }}
                  userBalance={userBalance}
                  spotlightedCreator={spotlightedCreator}
                  hostName={stream.creator?.username || 'Host'}
                />
              </div>
            </div>
          </>
        )}

        {/* Call Request Modal */}
        {showCallRequestModal && creatorCallSettings && (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowCallRequestModal(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 lg:bottom-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[450px]">
              <div className="bg-black/95 backdrop-blur-xl rounded-t-3xl lg:rounded-3xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Request Private Call</h3>
                    <p className="text-sm text-gray-400">with {stream.creator?.username}</p>
                  </div>
                  <button onClick={() => setShowCallRequestModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Your Balance */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-6">
                  <span className="text-gray-400">Your Balance</span>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-400">{userBalance.toLocaleString()}</span>
                  </div>
                </div>

                {/* Call Options */}
                <div className="space-y-3">
                  {/* Video Call Option */}
                  {creatorCallSettings.isAvailableForCalls && (
                    <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <Video className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">Video Call</h4>
                            <p className="text-sm text-gray-400">{creatorCallSettings.minimumCallDuration} min minimum</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-cyan-400">{creatorCallSettings.callRatePerMinute} coins/min</div>
                          <div className="text-xs text-gray-400">
                            ~{creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration} coins min
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRequestCall('video')}
                        disabled={isRequestingCall || userBalance < creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRequestingCall ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Video className="w-5 h-5" />
                            Request Video Call
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Voice Call Option */}
                  {creatorCallSettings.isAvailableForVoiceCalls && (
                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Phone className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white">Voice Call</h4>
                            <p className="text-sm text-gray-400">{creatorCallSettings.minimumVoiceCallDuration} min minimum</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-purple-400">{creatorCallSettings.voiceCallRatePerMinute} coins/min</div>
                          <div className="text-xs text-gray-400">
                            ~{creatorCallSettings.voiceCallRatePerMinute * creatorCallSettings.minimumVoiceCallDuration} coins min
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRequestCall('voice')}
                        disabled={isRequestingCall || userBalance < creatorCallSettings.voiceCallRatePerMinute * creatorCallSettings.minimumVoiceCallDuration}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isRequestingCall ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Phone className="w-5 h-5" />
                            Request Voice Call
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Not available message */}
                  {!creatorCallSettings.isAvailableForCalls && !creatorCallSettings.isAvailableForVoiceCalls && (
                    <div className="p-4 bg-white/5 rounded-xl text-center">
                      <p className="text-gray-400">This creator is not currently available for calls</p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {callRequestError && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                    <p className="text-red-400 text-sm text-center">{callRequestError}</p>
                  </div>
                )}

                {/* Insufficient Balance Warning */}
                {creatorCallSettings.isAvailableForCalls &&
                  userBalance < creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration && (
                  <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl">
                    <p className="text-amber-400 text-sm text-center">
                      You need at least {creatorCallSettings.callRatePerMinute * creatorCallSettings.minimumCallDuration} coins for a video call
                    </p>
                    <button
                      onClick={() => router.push('/wallet')}
                      className="w-full mt-2 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-400 font-semibold text-sm transition-colors"
                    >
                      Get Coins
                    </button>
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500 text-center">
                  The creator will be notified of your request. You'll be charged based on actual call duration.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Stream Ended Modal */}
        {streamEnded && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

            {/* Modal Content */}
            <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
              <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
                {/* Stream Ended Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                      </div>
                    </div>
                    {/* Pulse effect */}
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-2">
                  Stream Has Ended
                </h2>

                {/* Creator info */}
                {stream?.creator && (
                  <div className="flex items-center justify-center gap-3 mb-6">
                    {stream.creator.avatarUrl ? (
                      <img
                        src={stream.creator.avatarUrl}
                        alt={stream.creator.username || ''}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-sm font-bold">
                        {stream.creator.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Thanks for watching</p>
                      <p className="text-white font-semibold">@{stream.creator.username}</p>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{viewerCount}</div>
                    <div className="text-xs text-gray-400">Viewers</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">{peakViewers}</div>
                    <div className="text-xs text-gray-400">Peak Viewers</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {/* Visit Profile */}
                  {stream?.creator?.username && (
                    <button
                      onClick={() => router.push(`/${stream.creator?.username}`)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-xl font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Heart className="w-5 h-5" />
                      Follow @{stream.creator.username}
                    </button>
                  )}

                  {/* Browse Streams */}
                  <button
                    onClick={() => router.push('/live')}
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Browse More Streams
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
