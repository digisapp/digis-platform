'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useToastContext } from '@/context/ToastContext';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { CreatePollModal } from '@/components/streaming/CreatePollModal';
import { CreateCountdownModal } from '@/components/streaming/CreateCountdownModal';
import { AnnounceTicketedStreamModal } from '@/components/streaming/AnnounceTicketedStreamModal';
import {
  Users, Radio, Send, Target, Ticket, BarChart2, Clock,
  MessageCircle, ChevronDown, Settings, X, Ban, Volume2, VolumeX,
  Coins, Play, Square, Trophy, Pin
} from 'lucide-react';

interface StreamData {
  id: string;
  title: string;
  status: string;
  currentViewers: number;
  peakViewers: number;
  totalGiftsReceived: number;
  creatorId: string;
  tipMenuEnabled?: boolean;
}

interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  messageType: 'chat' | 'tip' | 'gift' | 'system' | 'super_tip' | 'ticket_purchase' | 'menu_purchase';
  giftId?: string;
  giftAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  tipMessage?: string;
  createdAt: Date;
  user?: {
    avatarUrl?: string;
    spendTier?: number;
  };
}

interface StreamGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  rewardText: string;
  isActive: boolean;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  endsAt: string;
  isActive: boolean;
}

interface Countdown {
  id: string;
  label: string;
  endsAt: string;
  isActive: boolean;
}

type TabType = 'chat' | 'controls' | 'stats';

export default function StreamRemoteControlPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
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

  // Play sound for tips
  const playTipSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio('/sounds/coin-common.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Use the same useStreamChat hook as the host page
  const { viewerCount, isConnected } = useStreamChat({
    streamId,
    isHost: true, // Don't count as viewer
    onMessage: (message) => {
      const newMessage = {
        id: message.id,
        streamId,
        userId: message.userId,
        username: message.username,
        message: message.content,
        messageType: (message.messageType || 'chat') as ChatMessage['messageType'],
        createdAt: new Date(message.timestamp),
        user: {
          avatarUrl: message.avatarUrl || undefined,
        },
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
      // Add gift message to chat
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

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (isAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isAutoScroll]);

  // Handle scroll
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
        setMessages(data.messages || []);
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

  // Send chat message as creator
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

  // Moderation actions
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

  // Toggle tip menu
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

  // Start VIP show
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

  // End stream
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

  // Goal handlers
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

  // Poll handlers
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

  // Countdown handlers
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white/10 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/90 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
            <span className={`font-semibold text-sm ${isConnected ? 'text-red-500' : 'text-gray-500'}`}>
              {isConnected ? 'LIVE' : 'CONNECTING...'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{viewerCount || stream?.currentViewers || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Coins className="w-4 h-4" />
            <span className="text-sm">{totalEarnings}</span>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-gray-400'}`}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-white/10">
        {(['chat', 'controls', 'stats'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-digis-cyan'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'chat' && <MessageCircle className="w-4 h-4 inline mr-1.5" />}
            {tab === 'controls' && <Settings className="w-4 h-4 inline mr-1.5" />}
            {tab === 'stats' && <BarChart2 className="w-4 h-4 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.messageType === 'tip' || msg.messageType === 'gift' || msg.messageType === 'super_tip'
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                    : msg.messageType === 'system'
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : 'bg-white/5'
                }`}
                onClick={() => msg.userId !== 'system' && msg.userId !== user?.id && setSelectedUser({ id: msg.userId, username: msg.username })}
              >
                {(msg.messageType === 'tip' || msg.messageType === 'gift' || msg.messageType === 'super_tip') && msg.giftAmount && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-400 text-lg">{msg.giftEmoji || '💎'}</span>
                    <span className="text-yellow-400 font-bold">{msg.giftAmount} coins</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${
                    msg.userId === user?.id
                      ? 'text-red-400'
                      : msg.messageType === 'tip' || msg.messageType === 'gift'
                      ? 'text-yellow-300'
                      : 'text-digis-cyan'
                  }`}>
                    @{msg.username}
                    {msg.userId === user?.id && <span className="ml-1 text-xs">(you)</span>}
                  </span>
                </div>
                <p className="text-white text-lg mt-1 break-words">
                  {msg.messageType === 'super_tip' ? msg.tipMessage : msg.message}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll button */}
          {!isAutoScroll && (
            <button
              onClick={() => {
                setIsAutoScroll(true);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-digis-cyan rounded-full flex items-center gap-2 shadow-lg"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="text-sm font-medium">New messages</span>
            </button>
          )}

          {/* Chat Input */}
          <form onSubmit={sendChatMessage} className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Send a message as creator..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!chatMessage.trim() || isSending}
                className="px-4 py-3 bg-digis-cyan text-black font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Controls Tab */}
      {activeTab === 'controls' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Goals Section */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Goals
              </h3>
              <button
                onClick={() => setShowGoalModal(true)}
                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm"
              >
                + Add
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="text-gray-500 text-sm">No active goals</p>
            ) : (
              <div className="space-y-2">
                {goals.filter(g => g.isActive).map((goal) => (
                  <div key={goal.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{goal.title}</span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {goal.currentAmount} / {goal.targetAmount} coins
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIP Show Section */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-400" />
                VIP Show
              </h3>
              {!announcedShow && !vipModeActive && (
                <button
                  onClick={() => setShowAnnounceModal(true)}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm"
                >
                  Announce
                </button>
              )}
            </div>
            {vipModeActive ? (
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                <p className="text-purple-400 font-medium">VIP Show Active</p>
                <p className="text-sm text-gray-400">Only ticket holders can view</p>
              </div>
            ) : announcedShow ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="font-medium">{announcedShow.title}</p>
                <p className="text-sm text-gray-400">{announcedShow.ticketPrice} coins</p>
                <button
                  onClick={startVipShow}
                  disabled={startingVipStream}
                  className="mt-2 w-full py-2 bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {startingVipStream ? 'Starting...' : 'Start VIP Show'}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No VIP show announced</p>
            )}
          </div>

          {/* Polls Section */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                Poll
              </h3>
              {!activePoll && (
                <button
                  onClick={() => setShowCreatePollModal(true)}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm"
                >
                  Create
                </button>
              )}
            </div>
            {activePoll ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="font-medium mb-2">{activePoll.question}</p>
                {activePoll.options.map((opt, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <span>{opt}</span>
                    <span className="text-blue-400">{activePoll.voteCounts[i]} votes</span>
                  </div>
                ))}
                <button
                  onClick={endPoll}
                  className="mt-2 w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                >
                  End Poll
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active poll</p>
            )}
          </div>

          {/* Countdown Section */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Countdown
              </h3>
              {!activeCountdown && (
                <button
                  onClick={() => setShowCreateCountdownModal(true)}
                  className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-sm"
                >
                  Start
                </button>
              )}
            </div>
            {activeCountdown ? (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="font-medium">{activeCountdown.label}</p>
                <button
                  onClick={cancelCountdown}
                  className="mt-2 w-full py-2 bg-red-500/20 text-red-400 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active countdown</p>
            )}
          </div>

          {/* Tip Menu Toggle */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tip Menu</h3>
              <button
                onClick={toggleTipMenu}
                className={`px-4 py-2 rounded-lg font-medium ${
                  menuEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {menuEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          {/* End Stream */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="w-full py-3 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Square className="w-5 h-5" />
            End Stream
          </button>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{viewerCount || stream?.currentViewers || 0}</p>
              <p className="text-xs text-gray-400">Current Viewers</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold">{peakViewers}</p>
              <p className="text-xs text-gray-400">Peak Viewers</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Coins className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold">{totalEarnings}</p>
              <p className="text-xs text-gray-400">Total Coins</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold">{leaderboard.length}</p>
              <p className="text-xs text-gray-400">Supporters</p>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Top Supporters
            </h3>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm">No supporters yet</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((supporter, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500 text-black' :
                        i === 1 ? 'bg-gray-400 text-black' :
                        i === 2 ? 'bg-orange-600 text-white' :
                        'bg-white/10 text-gray-400'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-medium">@{supporter.username}</span>
                    </div>
                    <span className="text-yellow-400 font-semibold">{supporter.totalCoins}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={() => setSelectedUser(null)}>
          <div className="bg-gray-900 w-full max-w-md rounded-t-2xl p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
            <p className="text-center text-lg mb-4">@{selectedUser.username}</p>
            <div className="space-y-2">
              <button
                onClick={() => handleTimeout(selectedUser.id, selectedUser.username)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-yellow-500/20 text-yellow-400 rounded-xl"
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">Timeout (5 min)</span>
              </button>
              <button
                onClick={() => handleBan(selectedUser.id, selectedUser.username)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl"
              >
                <Ban className="w-5 h-5" />
                <span className="font-medium">Ban from Stream</span>
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full px-4 py-3 bg-white/10 text-gray-400 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Stream Confirm Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowEndConfirm(false)}>
          <div className="bg-gray-900 w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-center mb-2">End Stream?</h3>
            <p className="text-gray-400 text-center mb-6">This will end your stream for all viewers.</p>
            <div className="space-y-2">
              <button
                onClick={handleEndStream}
                disabled={isEnding}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {isEnding ? 'Ending...' : 'End Stream'}
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="w-full py-3 bg-white/10 text-gray-400 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showGoalModal && (
        <SetGoalModal
          isOpen={showGoalModal}
          streamId={streamId}
          existingGoal={editingGoal}
          onClose={() => {
            setShowGoalModal(false);
            setEditingGoal(null);
          }}
          onGoalCreated={handleGoalCreated}
        />
      )}

      {showCreatePollModal && (
        <CreatePollModal
          isOpen={showCreatePollModal}
          streamId={streamId}
          onClose={() => setShowCreatePollModal(false)}
          onPollCreated={handlePollCreated}
        />
      )}

      {showCreateCountdownModal && (
        <CreateCountdownModal
          isOpen={showCreateCountdownModal}
          streamId={streamId}
          onClose={() => setShowCreateCountdownModal(false)}
          onCountdownCreated={handleCountdownCreated}
        />
      )}

      {showAnnounceModal && (
        <AnnounceTicketedStreamModal
          streamId={streamId}
          currentViewers={viewerCount || stream?.currentViewers || 0}
          onClose={() => setShowAnnounceModal(false)}
          onSuccess={(show) => {
            setAnnouncedShow({
              id: show.id,
              title: show.title,
              ticketPrice: show.ticketPrice,
              startsAt: new Date(show.startsAt),
            });
            setShowAnnounceModal(false);
            showSuccess('VIP show announced!');
          }}
        />
      )}

      {/* Stream Title Footer */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/90">
        <p className="text-gray-400 text-sm truncate">{stream?.title}</p>
      </div>
    </div>
  );
}
