'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';
import { Users, Radio, Ban, Clock, ChevronDown, Volume2, VolumeX } from 'lucide-react';

interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  messageType: 'chat' | 'tip' | 'gift' | 'system' | 'super_tip';
  giftId?: string;
  giftAmount?: number;
  tipMessage?: string;
  createdAt: Date;
  user?: {
    avatarUrl?: string;
    spendTier?: number;
  };
}

interface StreamData {
  id: string;
  title: string;
  status: string;
  currentViewers: number;
  creatorId: string;
}

export default function ChatMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
  const { user, loading: authLoading } = useAuth();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const ablyRef = useRef<Ably.Realtime | null>(null);

  // Scroll to bottom - use scrollTop on container to prevent page scroll on mobile
  const scrollToBottom = useCallback(() => {
    if (isAutoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [isAutoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAutoScroll(isAtBottom);
  }, []);

  // Play sound for tips
  const playTipSound = useCallback(() => {
    if (soundEnabled) {
      const audio = new Audio('/sounds/tip.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [soundEnabled]);

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

        // Check if user is the creator
        if (data.stream.creatorId !== user.id) {
          setError('Only the stream creator can access this monitor');
          setLoading(false);
          return;
        }

        setStream(data.stream);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load stream');
        setLoading(false);
      }
    };

    fetchStream();
  }, [streamId, user, authLoading, router]);

  // Fetch initial messages
  useEffect(() => {
    if (!stream) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/messages?limit=50`);
        if (res.ok) {
          const data = await res.json();
          // API returns messages in DESC order (newest first), reverse for chat order
          const normalizedMessages = (data.messages || []).reverse().map((msg: any) => ({
            ...msg,
            message: msg.message || msg.content || '', // Ensure message field is set
            createdAt: new Date(msg.createdAt),
          }));
          setMessages(normalizedMessages);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();
  }, [stream, streamId]);

  // Subscribe to Ably for real-time messages
  useEffect(() => {
    if (!stream) return;

    let chatChannel: Ably.RealtimeChannel | null = null;
    let presenceChannel: Ably.RealtimeChannel | null = null;

    const setupAbly = async () => {
      try {
        const ably = getAblyClient();
        ablyRef.current = ably;

        chatChannel = ably.channels.get(`stream:${streamId}:chat`);

        // Subscribe to 'chat' event (this is what the server broadcasts on)
        chatChannel.subscribe('chat', (message) => {
          const msgData = message.data as any;
          // Normalize message data - server broadcasts 'message' field
          const newMessage: ChatMessage = {
            id: msgData.id || `msg-${Date.now()}`,
            streamId,
            userId: msgData.userId || '',
            username: msgData.username || 'Anonymous',
            message: msgData.message ?? msgData.content ?? '',
            messageType: (msgData.messageType || 'chat') as ChatMessage['messageType'],
            createdAt: new Date(msgData.createdAt || Date.now()),
            user: {
              avatarUrl: msgData.avatarUrl || msgData.user?.avatarUrl,
              spendTier: msgData.spendTier || msgData.user?.spendTier,
            },
            giftId: msgData.giftId,
            giftAmount: msgData.giftAmount,
            tipMessage: msgData.tipMessage,
          };
          setMessages((prev) => [...prev.slice(-200), newMessage]); // Keep last 200

          // Play sound for tips/gifts
          if (newMessage.messageType === 'tip' || newMessage.messageType === 'gift' || newMessage.messageType === 'super_tip') {
            playTipSound();
          }
        });

        // Subscribe to viewer count updates
        presenceChannel = ably.channels.get(`stream:${streamId}:presence`);
        presenceChannel.subscribe('viewer_count', (message) => {
          setStream((prev) => prev ? { ...prev, currentViewers: message.data.count } : prev);
        });

      } catch (err) {
        console.error('Ably setup error:', err);
      }
    };

    setupAbly();

    return () => {
      // Unsubscribe from channels but don't close the shared client
      if (chatChannel) {
        chatChannel.unsubscribe();
      }
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
    };
  }, [stream, streamId, playTipSound]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Moderation actions
  const handleTimeout = async (userId: string, username: string) => {
    try {
      await fetch(`/api/streams/${streamId}/timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewerId: userId, duration: 300 }), // 5 min timeout
      });
      setSelectedUser(null);
      // Show brief confirmation
      setMessages((prev) => [...prev, {
        id: `system-${Date.now()}`,
        streamId,
        userId: 'system',
        username: 'System',
        message: `${username} has been timed out for 5 minutes`,
        messageType: 'system',
        createdAt: new Date(),
      }]);
    } catch (err) {
      console.error('Timeout failed:', err);
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
      setMessages((prev) => [...prev, {
        id: `system-${Date.now()}`,
        streamId,
        userId: 'system',
        username: 'System',
        message: `${username} has been banned from this stream`,
        messageType: 'system',
        createdAt: new Date(),
      }]);
    } catch (err) {
      console.error('Ban failed:', err);
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
      {/* Header - Minimal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/90 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-red-500 font-semibold text-sm">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{stream?.currentViewers?.toLocaleString() || 0}</span>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-gray-400'}`}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Chat Messages */}
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
            onClick={() => msg.userId !== 'system' && setSelectedUser({ id: msg.userId, username: msg.username })}
          >
            {/* Tip/Gift Header */}
            {(msg.messageType === 'tip' || msg.messageType === 'gift' || msg.messageType === 'super_tip') && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400 text-lg">💎</span>
                <span className="text-yellow-400 font-bold">
                  {msg.giftAmount} coins
                </span>
              </div>
            )}

            {/* Username */}
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${
                msg.messageType === 'tip' || msg.messageType === 'gift' || msg.messageType === 'super_tip'
                  ? 'text-yellow-300'
                  : msg.messageType === 'system'
                  ? 'text-blue-400'
                  : 'text-digis-cyan'
              }`}>
                @{msg.username}
              </span>
            </div>

            {/* Message */}
            <p className="text-white text-lg mt-1 break-words">
              {msg.messageType === 'super_tip' ? msg.tipMessage : msg.message}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isAutoScroll && (
        <button
          onClick={() => {
            setIsAutoScroll(true);
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-digis-cyan rounded-full flex items-center gap-2 shadow-lg"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="text-sm font-medium">New messages</span>
        </button>
      )}

      {/* Moderation Actions Modal */}
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

      {/* Stream Title Footer */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/90">
        <p className="text-gray-400 text-sm truncate">{stream?.title}</p>
      </div>
    </div>
  );
}
