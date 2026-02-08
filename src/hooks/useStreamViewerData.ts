'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
import { useStreamChat } from '@/hooks/useStreamChat';
import type { StreamMessage, StreamGoal, VirtualGift, StreamGift } from '@/db/schema';
import type {
  StreamWithCreator, FeaturedCreator, CreatorCallSettings, AccessDenied,
  ActivePoll, ActiveCountdown, ActiveGuest, GuestInviteData, GiftAnimation, FloatingGift,
} from '@/components/streaming/stream-viewer/types';

export function useStreamViewerData({ streamId }: { streamId: string }) {
  // Stream state
  const [stream, setStream] = useState<StreamWithCreator | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [accessDenied, setAccessDenied] = useState<AccessDenied | null>(null);
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
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [activeCountdown, setActiveCountdown] = useState<ActiveCountdown | null>(null);

  // Goal completion state
  const [completedGoal, setCompletedGoal] = useState<{ title: string; rewardText: string } | null>(null);

  // Call request state
  const [creatorCallSettings, setCreatorCallSettings] = useState<CreatorCallSettings | null>(null);

  // Guest call-in state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [guestRequestsEnabled, setGuestRequestsEnabled] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [activeGuest, setActiveGuest] = useState<ActiveGuest | null>(null);
  const [guestInvite, setGuestInvite] = useState<GuestInviteData | null>(null);

  // Animations
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimation[]>([]);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        currentUserIdRef.current = user.id;
      }
    };
    fetchCurrentUser();
  }, []);

  // Subscribe to user notifications for guest invites
  useEffect(() => {
    if (!currentUserId) return;

    let mounted = true;
    let notificationChannel: any = null;

    const setupNotifications = async () => {
      try {
        const { getAblyClient } = await import('@/lib/ably/client');
        const ably = getAblyClient();

        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => { clearTimeout(timeout); resolve(); });
            ably.connection.once('failed', () => { clearTimeout(timeout); reject(new Error('Connection failed')); });
          });
        }

        if (!mounted) return;

        notificationChannel = ably.channels.get(`user:${currentUserId}:notifications`);
        notificationChannel.subscribe('guest_invite', (message: any) => {
          if (!mounted) return;
          const data = message.data;
          setGuestInvite({
            inviteId: data.inviteId,
            viewerId: data.viewerId,
            inviteType: data.inviteType,
            host: data.host,
            streamTitle: data.streamTitle,
          });
        });
      } catch (error) {
        console.error('[Guest Invite] Setup error:', error);
      }
    };

    setupNotifications();

    return () => {
      mounted = false;
      if (notificationChannel) notificationChannel.unsubscribe();
    };
  }, [currentUserId]);

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
    if (stream && !isJoined) joinStream();
    return () => { if (isJoined) leaveStream(); };
  }, [stream, isJoined]);

  // Auto-leave on browser close
  useEffect(() => {
    if (!isJoined) return;

    const handleBeforeUnload = () => {
      const url = `/api/streams/${streamId}/leave`;
      const success = navigator.sendBeacon(url);
      if (!success) {
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isJoined, streamId]);

  // Real-time subscriptions with Ably
  const { viewerCount: ablyViewerCount, connectionState } = useStreamChat({
    streamId,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message as unknown as StreamMessage]);
    },
    onTip: (tipData) => {
      if (tipData.amount) {
        setFloatingGifts(prev => [...prev, {
          id: `tip-${Date.now()}-${Math.random()}`,
          emoji: '💰',
          rarity: 'tip',
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
    onStreamEnded: () => setStreamEnded(true),
    onGoalUpdate: (update) => {
      fetchGoals();
      if (update.action === 'completed' && update.goal) {
        setCompletedGoal({
          title: update.goal.title || 'Stream Goal',
          rewardText: update.goal.rewardText || 'Goal reached!',
        });
        const audio = new Audio('/sounds/goal-complete.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        setTimeout(() => setCompletedGoal(null), 5000);
      }
    },
    onSpotlightChanged: (event) => {
      if (event.spotlightedCreator) {
        setFeaturedCreators(prev => prev.map(c => ({
          ...c,
          isSpotlighted: c.creatorId === event.spotlightedCreator?.creatorId,
        })));
      } else {
        setFeaturedCreators(prev => prev.map(c => ({ ...c, isSpotlighted: false })));
      }
    },
    onPollUpdate: (event) => {
      if (event.action === 'created' || event.action === 'updated') {
        setActivePoll(event.poll);
      } else if (event.action === 'ended') {
        setActivePoll(null);
      }
    },
    onCountdownUpdate: (event) => {
      if (event.action === 'created') {
        setActiveCountdown(event.countdown);
      } else if (event.action === 'cancelled' || event.action === 'ended') {
        setActiveCountdown(null);
      }
    },
    onGuestAccepted: (event) => {
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
      setActiveGuest({
        userId: event.userId,
        username: event.username,
        displayName: event.displayName,
        avatarUrl: null,
        requestType: event.requestType,
      });
    },
    onGuestRemoved: () => {
      setActiveGuest(null);
      setIsGuest(false);
    },
    onGuestRequestsToggle: (event) => setGuestRequestsEnabled(event.enabled),
    onGuestInvite: (event) => {
      const userId = currentUserIdRef.current;
      if (event.viewerId === userId) setGuestInvite(event);
    },
  });

  // Update viewer count from Ably presence
  useEffect(() => {
    if (ablyViewerCount > 0) setViewerCount(ablyViewerCount);
  }, [ablyViewerCount]);

  // Poll for active poll vote updates
  useEffect(() => {
    if (!activePoll?.isActive) return;
    const interval = setInterval(fetchPoll, 5000);
    return () => clearInterval(interval);
  }, [activePoll?.isActive, streamId]);

  // --- Fetch functions ---

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
        setGuestRequestsEnabled(data.stream.guestRequestsEnabled || false);
        if (data.stream.activeGuestId) {
          try {
            const guestRes = await fetch(`/api/streams/${streamId}/guest`);
            const guestData = await guestRes.json();
            if (guestRes.ok && guestData.activeGuest) setActiveGuest(guestData.activeGuest);
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
        if (data.requiresTicket) fetchUserBalance();
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
      if (response.ok) setCreatorCallSettings(data.settings);
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

  const removeFloatingGift = useCallback((id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
  }, []);

  const removeGiftAnimation = (index: number) => {
    setGiftAnimations((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    stream, messages, setMessages, token, serverUrl, loading, error,
    accessDenied, setAccessDenied, isPurchasingTicket, setIsPurchasingTicket,
    streamEnded, userBalance, isFollowing, setIsFollowing, followLoading, setFollowLoading,
    viewerCount, peakViewers, leaderboard, goals, featuredCreators,
    activePoll, setActivePoll, activeCountdown, setActiveCountdown,
    completedGoal, creatorCallSettings,
    currentUserId, guestRequestsEnabled, isGuest, setIsGuest,
    activeGuest, setActiveGuest, guestInvite, setGuestInvite,
    giftAnimations, floatingGifts, isMobile, connectionState,
    fetchStreamDetails, fetchUserBalance, fetchPoll, fetchGoals,
    removeFloatingGift, removeGiftAnimation,
  };
}
