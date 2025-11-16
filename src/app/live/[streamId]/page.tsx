'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { streamAnalytics } from '@/lib/utils/analytics';
import {
  Volume2, VolumeX, Maximize, Minimize, Users,
  Heart, Share2, Settings, X, Send, DollarSign,
  Trophy, Target
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  status: 'live' | 'ended';
  privacy: 'public' | 'private' | 'followers';
  currentViewers: number;
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
}

interface Viewer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
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
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showViewerList, setShowViewerList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Viewers state
  const [viewers, setViewers] = useState<Viewer[]>([]);

  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // Load stream data
  useEffect(() => {
    loadStream();
    loadCurrentUser();
  }, [streamId]);

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

  // Load stream URL
  useEffect(() => {
    if (!stream) return;

    const loadStreamUrl = async () => {
      try {
        const response = await fetch(`/api/streams/${streamId}/token`);
        if (response.ok) {
          const data = await response.json();
          setStreamUrl(data.streamUrl || `/api/streams/${streamId}/hls`);
        }
      } catch (error) {
        console.error('[TheaterMode] Error loading stream URL:', error);
      }
    };

    loadStreamUrl();
  }, [stream, streamId]);

  const loadStream = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      if (!response.ok) {
        throw new Error('Stream not found');
      }

      const data = await response.json();
      setStream(data);

      if (data.status === 'ended') {
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

        // Check if following creator
        if (stream) {
          const followResponse = await fetch(`/api/follow/${stream.creator.id}`);
          const followData = await followResponse.json();
          setIsFollowing(followData.isFollowing);
        }
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

  // Handle tip
  const handleTip = async (amount: number) => {
    if (!currentUser) {
      alert('Please sign in to send tips');
      return;
    }

    if (userBalance < amount) {
      alert(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, streamId }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.newBalance);
        streamAnalytics.quickTipSent(streamId, amount);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send tip');
      }
    } catch (error) {
      console.error('[TheaterMode] Error sending tip:', error);
      alert('Failed to send tip');
    }
  };

  // Toggle follow
  const toggleFollow = async () => {
    if (!currentUser || !stream) return;

    try {
      const response = await fetch(`/api/follow/${stream.creator.id}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (error) {
      console.error('[TheaterMode] Error toggling follow:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 glass-dark border-b border-cyan-400/20 backdrop-blur-xl shadow-[0_0_15px_rgba(34,211,238,0.1)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Creator Info */}
          <div className="flex items-center gap-3">
            {stream.creator.avatarUrl ? (
              <img
                src={stream.creator.avatarUrl}
                alt={stream.creator.displayName || stream.creator.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center font-bold">
                {stream.creator.displayName?.[0] || stream.creator.username[0]}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {stream.creator.displayName || stream.creator.username}
                </span>
                {stream.creator.isVerified && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="text-xs text-white/60">
                {stream.currentViewers.toLocaleString()} watching
              </div>
            </div>
          </div>

          {/* Live Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-bold">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Follow Button */}
          {currentUser && currentUser.id !== stream.creator.id && (
            <button
              onClick={toggleFollow}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                isFollowing
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={shareStream}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Player Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-black via-gray-900 to-black">
          {/* Video */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted={muted}
              controls={false}
              preload="metadata"
              poster={`/api/streams/poster?streamId=${streamId}`}
              className="w-full h-full object-contain"
            >
              {streamUrl && <source src={streamUrl} type="application/x-mpegURL" />}
              Your browser does not support video playback.
            </video>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm">
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
          <div className="px-4 py-3 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)]">
            <h2 className="text-xl font-bold mb-1 bg-gradient-to-r from-white via-cyan-100 to-pink-100 bg-clip-text text-transparent">{stream.title}</h2>
            {stream.description && (
              <p className="text-sm text-white/80">{stream.description}</p>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="px-4 py-3 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-cyan-200 mr-2 font-semibold">Quick Tip:</span>
              {[5, 10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={!currentUser}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-gray-900 font-bold text-sm hover:scale-110 transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                  {amount}
                </button>
              ))}
            </div>

            {currentUser && (
              <div className="mt-2 text-xs text-cyan-300 font-medium">
                Your balance: {userBalance} coins
              </div>
            )}
          </div>

          {/* Stream Goals Widget */}
          {stream.goals && stream.goals.length > 0 && (
            <div className="px-4 py-3 glass-dark border-t border-purple-400/30 backdrop-blur-xl shadow-[0_-2px_20px_rgba(168,85,247,0.15)]">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Stream Goals</span>
              </div>
              {stream.goals.map((goal) => (
                <div key={goal.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/90 font-medium">{goal.description}</span>
                    <span className="text-purple-300 font-semibold">
                      {goal.currentAmount} / {goal.targetAmount}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-purple-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                      style={{
                        width: `${Math.min(
                          (goal.currentAmount / goal.targetAmount) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Chat & Viewers */}
        {showChat && (
          <div className="w-96 glass-dark border-l border-cyan-400/30 flex flex-col backdrop-blur-2xl shadow-[-4px_0_30px_rgba(34,211,238,0.15)]">
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
                  <span>{stream.currentViewers}</span>
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
                      <div key={msg.id} className="flex gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        {msg.avatarUrl ? (
                          <img
                            src={msg.avatarUrl}
                            alt={msg.username}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-cyan-400/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-lg shadow-cyan-500/30">
                            {msg.displayName?.[0] || msg.username[0]}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                msg.isCreator ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-cyan-100'
                              }`}
                            >
                              {msg.displayName || msg.username}
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
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-cyan-400/20 bg-gradient-to-r from-cyan-500/5 to-pink-500/5 backdrop-blur-xl">
                  {currentUser ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Send a message..."
                        disabled={sendingMessage}
                        className="flex-1 px-4 py-2 bg-white/10 border border-cyan-400/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-50 backdrop-blur-sm transition-all"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-white/70">
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
                            {viewer.displayName?.[0] || viewer.username[0]}
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
    </div>
  );
}
