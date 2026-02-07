'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  category?: string | null;
  tags?: string[] | null;
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

interface AccessDeniedInfo {
  reason: string;
  creatorId?: string;
  creatorUsername?: string;
  requiresSubscription?: boolean;
  requiresFollow?: boolean;
  requiresTicket?: boolean;
  ticketPrice?: number;
  subscriptionPrice?: number;
}

interface Viewer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  avatarUrl?: string;
  totalSpent: number;
}

interface ActivePoll {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  endsAt: string;
  isActive: boolean;
}

interface ActiveCountdown {
  id: string;
  label: string;
  endsAt: string;
  isActive: boolean;
}

interface ActiveGuest {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  requestType: 'video' | 'voice';
}

type MenuItem = {
  id: string;
  label: string;
  emoji: string | null;
  price: number;
  description: string | null;
  itemCategory?: string;
  fulfillmentType?: string;
};

interface UseViewerDataParams {
  streamId: string;
  showViewerList: boolean;
  dismissedTicketedStream: any;
  ticketedAnnouncement: any;
  setUpcomingTicketedShow: (show: any) => void;
  setCurrentUser: (user: any) => void;
  setUserBalance: (balance: number) => void;
}

export function useViewerData({
  streamId,
  showViewerList,
  dismissedTicketedStream,
  ticketedAnnouncement,
  setUpcomingTicketedShow,
  setCurrentUser,
  setUserBalance,
}: UseViewerDataParams) {
  // Use refs for ticket state to avoid stale closures in loadStream callback
  const dismissedTicketedStreamRef = useRef(dismissedTicketedStream);
  dismissedTicketedStreamRef.current = dismissedTicketedStream;
  const ticketedAnnouncementRef = useRef(ticketedAnnouncement);
  ticketedAnnouncementRef.current = ticketedAnnouncement;
  const setUpcomingTicketedShowRef = useRef(setUpcomingTicketedShow);
  setUpcomingTicketedShowRef.current = setUpcomingTicketedShow;

  // Core stream data
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<AccessDeniedInfo | null>(null);

  // LiveKit connection
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [streamOrientation, setStreamOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuEnabled, setMenuEnabled] = useState(true);

  // Interactive overlays
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [activeCountdown, setActiveCountdown] = useState<ActiveCountdown | null>(null);
  const [activeGuest, setActiveGuest] = useState<ActiveGuest | null>(null);

  // Viewer list + leaderboard
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // --- Fetch Functions ---

  const loadStream = useCallback(async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);

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
      const streamData = data.stream || data;
      setStream(streamData);

      if (streamData.orientation === 'portrait') {
        setStreamOrientation('portrait');
      } else {
        setStreamOrientation('landscape');
      }

      if (typeof streamData.tipMenuEnabled === 'boolean') {
        console.log('[Menu] Stream tipMenuEnabled:', streamData.tipMenuEnabled);
        setMenuEnabled(streamData.tipMenuEnabled);
      }

      // Fetch menu items for this creator
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
      if (streamData.upcomingTicketedShow && !dismissedTicketedStreamRef.current && !ticketedAnnouncementRef.current) {
        setUpcomingTicketedShowRef.current(streamData.upcomingTicketedShow);
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
  }, [streamId]);

  const fetchPoll = useCallback(async () => {
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
  }, [streamId]);

  const fetchCountdown = useCallback(async () => {
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
  }, [streamId]);

  const fetchActiveGuest = useCallback(async () => {
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
  }, [streamId]);

  // Use refs for external setters to keep callbacks stable
  const setCurrentUserRef = useRef(setCurrentUser);
  setCurrentUserRef.current = setCurrentUser;
  const setUserBalanceRef = useRef(setUserBalance);
  setUserBalanceRef.current = setUserBalance;

  const loadCurrentUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        setCurrentUserRef.current(data.user);

        const walletResponse = await fetch('/api/wallet/balance');
        const walletData = await walletResponse.json();
        setUserBalanceRef.current(walletData.balance || 0);
      }
    } catch (error) {
      console.error('[TheaterMode] Error loading user:', error);
    }
  }, []);

  const loadToken = useCallback(async () => {
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
  }, [streamId]);

  // --- Effects ---

  // Initial data loading
  useEffect(() => {
    loadStream();
    loadCurrentUser();
    fetchPoll();
    fetchCountdown();
    fetchActiveGuest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  // Load LiveKit token when stream is live
  useEffect(() => {
    if (!stream || stream.status !== 'live') return;
    loadToken();
  }, [stream, streamId, loadToken]);

  // Refresh LiveKit token before 6-hour TTL expires
  useEffect(() => {
    if (!token) return;
    const REFRESH_MS = 5.5 * 60 * 60 * 1000;
    const timer = setTimeout(() => {
      console.log('[Viewer] Proactively refreshing token before TTL expiry');
      loadToken();
    }, REFRESH_MS);
    return () => clearTimeout(timer);
  }, [token, loadToken]);

  // Poll for active poll vote updates (every 15 seconds)
  useEffect(() => {
    if (!activePoll?.isActive) return;
    const interval = setInterval(fetchPoll, 15000);
    return () => clearInterval(interval);
  }, [activePoll?.isActive, streamId, fetchPoll]);

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
    const interval = setInterval(() => {
      fetchViewers();
      fetchLeaderboard();
    }, 20000);

    return () => clearInterval(interval);
  }, [showViewerList, streamId]);

  return {
    // Core data
    stream, setStream,
    loading, setLoading,
    error,
    accessDenied, setAccessDenied,
    // LiveKit
    token, serverUrl,
    streamOrientation,
    // Menu
    menuItems, setMenuItems,
    menuEnabled, setMenuEnabled,
    // Overlays
    activePoll, setActivePoll,
    activeCountdown, setActiveCountdown,
    activeGuest, setActiveGuest,
    // Viewer list
    viewers, leaderboard,
    // Functions
    loadStream,
    loadCurrentUser,
    loadToken,
    fetchPoll,
    fetchCountdown,
    fetchActiveGuest,
  };
}

export type { StreamData, AccessDeniedInfo, Viewer, ActivePoll, ActiveCountdown, ActiveGuest };
