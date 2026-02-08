'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useToastContext } from '@/context/ToastContext';
import type { StreamData, ChatMessage, StreamGoal, Poll, Countdown, TabType } from '@/components/stream-control/types';

export function useStreamControl(streamId: string) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToastContext();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);

  // Chat input
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Goals
  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StreamGoal | null>(null);

  // Polls & Countdowns
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [activeCountdown, setActiveCountdown] = useState<Countdown | null>(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showCreateCountdownModal, setShowCreateCountdownModal] = useState(false);

  // VIP Show
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announcedShow, setAnnouncedShow] = useState<{
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  } | null>(null);
  const [vipModeActive, setVipModeActive] = useState(false);
  const [startingVipStream, setStartingVipStream] = useState(false);

  // Stats
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; totalCoins: number }>>([]);
  const [menuEnabled, setMenuEnabled] = useState(true);

  // End stream
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const playTipSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio('/sounds/coin-common.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [soundEnabled]);

  const { viewerCount, isConnected } = useStreamChat({
    streamId,
    isHost: true,
    onMessage: (message) => {
      const msgData = message as any;
      const messageText = msgData.message ?? msgData.content ?? '';

      const newMessage: ChatMessage = {
        id: msgData.id || `msg-${Date.now()}`,
        streamId,
        userId: msgData.userId || '',
        username: msgData.username || 'Anonymous',
        message: messageText,
        messageType: (msgData.messageType || 'chat') as ChatMessage['messageType'],
        createdAt: new Date(msgData.createdAt || msgData.timestamp || Date.now()),
        user: {
          avatarUrl: msgData.avatarUrl || msgData.user?.avatarUrl || undefined,
          spendTier: msgData.spendTier || msgData.user?.spendTier || undefined,
        },
        giftId: msgData.giftId,
        giftAmount: msgData.giftAmount,
        giftEmoji: msgData.giftEmoji,
        giftName: msgData.giftName,
        tipMessage: msgData.tipMessage,
      };
      setMessages((prev) => [...prev.slice(-200), newMessage]);
    },
    onTip: (tip) => {
      playTipSound();
      setTotalEarnings((prev) => prev + tip.amount);
    },
    onGift: (gift) => {
      playTipSound();
      setTotalEarnings((prev) => prev + (gift.streamGift.quantity || 1) * (gift.gift.coinCost || 0));
      const giftMessage: ChatMessage = {
        id: `gift-${Date.now()}`,
        streamId,
        userId: gift.streamGift.senderId,
        username: gift.streamGift.senderUsername,
        message: `sent ${gift.gift.emoji} ${gift.gift.name}${gift.streamGift.quantity > 1 ? ` x${gift.streamGift.quantity}` : ''}`,
        messageType: 'gift',
        giftEmoji: gift.gift.emoji,
        giftName: gift.gift.name,
        giftAmount: gift.gift.coinCost * gift.streamGift.quantity,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev.slice(-200), giftMessage]);
    },
    onViewerCount: (count) => {
      setStream((prev) => prev ? { ...prev, currentViewers: count.currentViewers } : prev);
      if (count.peakViewers > peakViewers) {
        setPeakViewers(count.peakViewers);
      }
    },
    onGoalUpdate: () => {
      fetchGoals();
    },
    onPollUpdate: (event) => {
      if (event.action === 'ended') {
        setActivePoll(null);
      } else {
        fetchPoll();
      }
    },
    onCountdownUpdate: (event) => {
      if (event.action === 'ended' || event.action === 'cancelled') {
        setActiveCountdown(null);
      } else {
        fetchCountdown();
      }
    },
    onTicketedAnnouncement: (event) => {
      setAnnouncedShow({
        id: event.ticketedStreamId,
        title: event.title,
        ticketPrice: event.ticketPrice,
        startsAt: new Date(event.startsAt),
      });
    },
    onVipModeChange: (event) => {
      setVipModeActive(event.isActive);
    },
    onStreamEnded: () => {
      showSuccess('Stream has ended');
      router.push('/creator/dashboard');
    },
  });

  const scrollToBottom = useCallback(() => {
    if (isAutoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [isAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAutoScroll(isAtBottom);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch stream data
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      return;
    }

    const fetchStream = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}`);
        if (!res.ok) throw new Error('Stream not found');
        const data = await res.json();

        if (data.stream.creatorId !== user.id) {
          setError('Only the stream creator can access remote control');
          setLoading(false);
          return;
        }

        if (data.stream.status !== 'live') {
          setError('This stream is not live');
          setLoading(false);
          return;
        }

        setStream(data.stream);
        setTotalEarnings(data.stream.totalGiftsReceived || 0);
        setPeakViewers(data.stream.peakViewers || 0);
        setMenuEnabled(data.stream.tipMenuEnabled ?? true);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load stream');
        setLoading(false);
      }
    };

    fetchStream();
  }, [streamId, user, authLoading, router]);

  // Fetch initial data
  useEffect(() => {
    if (!stream) return;
    fetchMessages();
    fetchGoals();
    fetchLeaderboard();
    fetchPoll();
    fetchCountdown();
  }, [stream, streamId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        const normalizedMessages = (data.messages || []).reverse().map((msg: any) => ({
          ...msg,
          message: msg.message || msg.content || '',
          createdAt: new Date(msg.createdAt),
        }));
        setMessages(normalizedMessages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/goals`);
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  const fetchPoll = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/polls`);
      if (res.ok) {
        const data = await res.json();
        if (data.poll?.isActive) {
          setActivePoll(data.poll);
        } else {
          setActivePoll(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch poll:', err);
    }
  };

  const fetchCountdown = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/countdown`);
      if (res.ok) {
        const data = await res.json();
        if (data.countdown?.isActive) {
          setActiveCountdown(data.countdown);
        }
      }
    } catch (err) {
      console.error('Failed to fetch countdown:', err);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatMessage.trim() }),
      });

      if (res.ok) {
        setChatMessage('');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to send message');
      }
    } catch (err) {
      showError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleTimeout = async (userId: string, username: string) => {
    try {
      await fetch(`/api/streams/${streamId}/timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: userId, duration: 300 }),
      });
      setSelectedUser(null);
      showSuccess(`${username} timed out for 5 minutes`);
    } catch (err) {
      showError('Failed to timeout user');
    }
  };

  const handleBan = async (userId: string, username: string) => {
    try {
      await fetch(`/api/streams/${streamId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: userId }),
      });
      setSelectedUser(null);
      showSuccess(`${username} banned from stream`);
    } catch (err) {
      showError('Failed to ban user');
    }
  };

  const toggleTipMenu = async () => {
    try {
      const res = await fetch(`/api/streams/${streamId}/tip-menu/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !menuEnabled }),
      });
      if (res.ok) {
        setMenuEnabled(!menuEnabled);
        showSuccess(`Tip menu ${!menuEnabled ? 'enabled' : 'disabled'}`);
      }
    } catch (err) {
      showError('Failed to toggle tip menu');
    }
  };

  const startVipShow = async () => {
    if (!announcedShow) return;
    setStartingVipStream(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/start-vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: announcedShow.id }),
      });
      if (res.ok) {
        setVipModeActive(true);
        showSuccess('VIP show started!');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to start VIP show');
      }
    } catch (err) {
      showError('Failed to start VIP show');
    } finally {
      setStartingVipStream(false);
    }
  };

  const handleEndStream = async () => {
    setIsEnding(true);
    try {
      const res = await fetch(`/api/streams/${streamId}/end`, { method: 'POST' });
      if (res.ok) {
        showSuccess('Stream ended');
        router.push('/creator/dashboard');
      } else {
        showError('Failed to end stream');
      }
    } catch (err) {
      showError('Failed to end stream');
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  const handleGoalCreated = () => {
    setShowGoalModal(false);
    setEditingGoal(null);
    fetchGoals();
    showSuccess('Goal created!');
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}/goals/${goalId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchGoals();
        showSuccess('Goal deleted');
      }
    } catch (err) {
      showError('Failed to delete goal');
    }
  };

  const handlePollCreated = () => {
    setShowCreatePollModal(false);
    fetchPoll();
    showSuccess('Poll created!');
  };

  const endPoll = async () => {
    if (!activePoll) return;
    try {
      const res = await fetch(`/api/streams/${streamId}/polls/${activePoll.id}/end`, {
        method: 'POST',
      });
      if (res.ok) {
        setActivePoll(null);
        showSuccess('Poll ended');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to end poll');
      }
    } catch (err) {
      showError('Failed to end poll');
    }
  };

  const handleCountdownCreated = () => {
    setShowCreateCountdownModal(false);
    fetchCountdown();
    showSuccess('Countdown started!');
  };

  const cancelCountdown = async () => {
    if (!activeCountdown) return;
    try {
      const res = await fetch(`/api/streams/${streamId}/countdown`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActiveCountdown(null);
        showSuccess('Countdown cancelled');
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to cancel countdown');
      }
    } catch (err) {
      showError('Failed to cancel countdown');
    }
  };

  return {
    // State
    stream, messages, loading, error, activeTab, setActiveTab,
    isAutoScroll, setIsAutoScroll, soundEnabled, setSoundEnabled,
    selectedUser, setSelectedUser,
    chatMessage, setChatMessage, isSending,
    goals, showGoalModal, setShowGoalModal, editingGoal, setEditingGoal,
    activePoll, activeCountdown,
    showCreatePollModal, setShowCreatePollModal,
    showCreateCountdownModal, setShowCreateCountdownModal,
    showAnnounceModal, setShowAnnounceModal,
    announcedShow, setAnnouncedShow,
    vipModeActive, startingVipStream,
    totalEarnings, peakViewers, leaderboard, menuEnabled,
    showEndConfirm, setShowEndConfirm, isEnding,
    // Refs
    messagesEndRef, messagesContainerRef, chatInputRef,
    // Connection
    viewerCount, isConnected,
    user, authLoading,
    // Actions
    sendChatMessage, handleScroll,
    handleTimeout, handleBan, toggleTipMenu, startVipShow,
    handleEndStream, handleGoalCreated, handleDeleteGoal,
    handlePollCreated, endPoll, handleCountdownCreated, cancelCountdown,
  };
}
