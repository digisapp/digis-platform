'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
import type { Stream, StreamMessage, StreamGoal } from '@/db/schema';

export const MAX_CHAT_MESSAGES = 200;

export interface UseBroadcasterDataParams {
  streamId: string;
  showError: (msg: string) => void;
}

export function useBroadcasterData({ streamId, showError }: UseBroadcasterDataParams) {
  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [completedGoalIds, setCompletedGoalIds] = useState<Set<string>>(new Set());
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
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [menuItems, setMenuItems] = useState<Array<{ id: string; label: string; emoji: string | null; price: number }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; senderId: string; totalCoins: number }>>([]);
  const [streamOrientation, setStreamOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [announcedTicketedStream, setAnnouncedTicketedStream] = useState<{
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  } | null>(null);
  const [vipModeActive, setVipModeActive] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // --- Fetch functions ---

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
        setTotalEarnings(data.stream.totalGiftsReceived);
        setStreamOrientation(data.stream.orientation || 'landscape');
        setMenuEnabled(data.stream.tipMenuEnabled ?? true);

        // Restore VIP mode state if active (handles page refresh)
        if (data.stream.vipModeActive && data.stream.activeVipShow) {
          setVipModeActive(true);
          setAnnouncedTicketedStream({
            id: data.stream.activeVipShow.id,
            title: data.stream.activeVipShow.title,
            ticketPrice: data.stream.activeVipShow.ticketPrice,
            startsAt: new Date(data.stream.activeVipShow.startsAt),
          });
        } else if (data.stream.upcomingTicketedShow) {
          setAnnouncedTicketedStream({
            id: data.stream.upcomingTicketedShow.id,
            title: data.stream.upcomingTicketedShow.title,
            ticketPrice: data.stream.upcomingTicketedShow.ticketPrice,
            startsAt: new Date(data.stream.upcomingTicketedShow.startsAt),
          });
        }

        // Fetch menu items for the creator
        if (data.stream.creatorId) {
          fetch(`/api/tip-menu/${data.stream.creatorId}`)
            .then(res => res.json())
            .then(menuData => {
              if (menuData.items && menuData.items.length > 0) {
                setMenuItems(menuData.items);
              }
            })
            .catch(err => console.error('Error fetching menu items:', err));
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
      const response = await fetchWithRetry(`/api/streams/${streamId}/messages`, {
        retries: 3,
        backoffMs: 1000,
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages.reverse());
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching messages:', err);
        showError('Failed to load messages');
      }
    }
  };

  const fetchBroadcastToken = async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      console.log(`[Broadcast] Fetching token (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      const response = await fetch(`/api/streams/${streamId}/broadcast-token`, {
        credentials: 'same-origin',
      });
      const data = await response.json();

      if (response.ok) {
        console.log('[Broadcast] Token received successfully');
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } else if (response.status === 401 && retryCount < maxRetries) {
        console.warn(`[Broadcast] Auth not ready (401), retrying in ${(retryCount + 1)}s...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return fetchBroadcastToken(retryCount + 1);
      } else {
        console.error(`[Broadcast] Token fetch failed: ${data.error} (status ${response.status})`);
        setError(data.error || 'Not authorized to broadcast');
      }
    } catch (err) {
      if (retryCount < maxRetries) {
        console.warn(`[Broadcast] Token fetch error, retrying in ${(retryCount + 1)}s...`, err);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return fetchBroadcastToken(retryCount + 1);
      }
      console.error('[Broadcast] Token fetch failed after all retries:', err);
      setError('Failed to get broadcast token. Please check your connection and try again.');
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetchWithRetry(`/api/streams/${streamId}/goals`, {
        retries: 3,
        backoffMs: 1000,
      });
      const data = await response.json();
      if (response.ok) {
        const newGoals = data.goals;

        newGoals.forEach((goal: StreamGoal) => {
          const isComplete = goal.currentAmount >= goal.targetAmount;
          const wasAlreadyCompleted = completedGoalIds.has(goal.id);

          if (isComplete && !wasAlreadyCompleted && goal.isActive) {
            setCompletedGoalIds(prev => new Set(prev).add(goal.id));

            const audio = new Audio('/sounds/goal-complete.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});

            const goalCompleteMessage = {
              id: `goal-complete-${goal.id}-${Date.now()}`,
              streamId,
              userId: 'system',
              username: '🎯 Goal Complete!',
              message: `🎉 ${goal.description || 'Stream Goal'} reached! (${goal.targetAmount}/${goal.targetAmount} coins) 🎉`,
              messageType: 'system' as const,
              giftId: null,
              giftAmount: null,
              createdAt: new Date(),
            };
            setMessages((prev) => {
              const next = [...prev, goalCompleteMessage as StreamMessage];
              return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
            });
          }
        });

        setGoals(newGoals);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching goals:', err);
        showError('Failed to load goals');
      }
    }
  };

  const fetchPoll = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/polls`);
      const data = await response.json();
      if (response.ok) {
        setActivePoll(data.poll);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching poll:', err);
        showError('Failed to load poll');
      }
    }
  };

  const fetchCountdown = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/countdown`);
      const data = await response.json();
      if (response.ok) {
        setActiveCountdown(data.countdown);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching countdown:', err);
        showError('Failed to load countdown');
      }
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetchWithRetry(`/api/streams/${streamId}/leaderboard`, {
        retries: 3,
        backoffMs: 1000,
      });
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching leaderboard:', err);
      }
    }
  };

  // --- Effects ---

  // Initial data load
  useEffect(() => {
    fetchStreamDetails();
    fetchMessages();
    fetchBroadcastToken();
    fetchGoals();
    fetchLeaderboard();
    fetchPoll();
    fetchCountdown();
  }, [streamId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh LiveKit token before 6-hour TTL expires
  useEffect(() => {
    if (!token) return;
    const REFRESH_MS = 5.5 * 60 * 60 * 1000; // 5.5 hours
    const timer = setTimeout(() => {
      console.log('[Broadcast] Proactively refreshing token before TTL expiry');
      fetchBroadcastToken();
    }, REFRESH_MS);
    return () => clearTimeout(timer);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get current user ID and username
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        try {
          const profileRes = await fetch('/api/user/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setCurrentUsername(profileData.user?.username || null);
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }
      }
    };
    fetchUser();
  }, []);

  // Fetch poll data once when poll becomes active
  useEffect(() => {
    if (!activePoll?.isActive) return;
    fetchPoll();
  }, [activePoll?.isActive, streamId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    stream, setStream,
    messages, setMessages,
    token, setToken,
    serverUrl,
    loading,
    error, setError,
    viewerCount, setViewerCount,
    peakViewers, setPeakViewers,
    totalEarnings, setTotalEarnings,
    goals, setGoals,
    completedGoalIds,
    activePoll, setActivePoll,
    activeCountdown, setActiveCountdown,
    menuEnabled, setMenuEnabled,
    menuItems,
    leaderboard,
    streamOrientation,
    announcedTicketedStream, setAnnouncedTicketedStream,
    vipModeActive, setVipModeActive,
    currentUserId,
    currentUsername,
    // Fetch functions (for callbacks)
    fetchGoals,
    fetchLeaderboard,
    fetchPoll,
    fetchCountdown,
    fetchMessages,
    fetchBroadcastToken,
  };
}
