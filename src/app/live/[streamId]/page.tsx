'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { streamAnalytics } from '@/lib/utils/analytics';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Volume2, VolumeX, Maximize, Minimize, Users,
  Share2, X, Send, Target
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FloatingGiftBar } from '@/components/streaming/FloatingGiftBar';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { BRBOverlay } from '@/components/live/BRBOverlay';

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

  const loadStream = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      if (!response.ok) {
        throw new Error('Stream not found');
      }

      const data = await response.json();
      const streamData = data.stream || data; // Handle both { stream } and direct stream object
      setStream(streamData);

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

    const idempotencyKey = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white flex flex-col">
      {/* Header Bar - simplified for mobile */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 glass-dark border-b border-cyan-400/20 backdrop-blur-xl shadow-[0_0_15px_rgba(34,211,238,0.1)]">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
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
                {stream.creator.displayName?.[0] || stream.creator.username[0]}
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
                {stream.currentViewers.toLocaleString()} watching
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
        {/* Video Player Area */}
        <div className="flex flex-col bg-gradient-to-b from-black via-gray-900 to-black min-h-0 lg:flex-1">
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
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-white/60 mt-4">Loading stream...</p>
                </div>
              </div>
            )}

            {/* Stream Goals Overlay - floating over video on mobile */}
            {stream.goals && stream.goals.length > 0 && (
              <div className="absolute top-4 left-4 right-4 z-20 lg:hidden">
                {stream.goals.map((goal) => {
                  const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  return (
                    <div
                      key={goal.id}
                      className="glass-dark rounded-xl p-3 border border-purple-400/30 backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                        <span className="text-xs font-bold text-white truncate flex-1">{goal.description}</span>
                        <span className="text-xs text-purple-300 font-semibold">
                          {goal.currentAmount}/{goal.targetAmount}
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden border border-purple-500/20">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm z-10">
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
          <div className="px-3 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)]">
            <h2 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-pink-100 bg-clip-text text-transparent truncate">{stream.title}</h2>
            {stream.description && (
              <p className="text-xs text-white/80 truncate hidden sm:block">{stream.description}</p>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="px-4 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-cyan-200 mr-1 font-semibold hidden sm:inline">Tip:</span>
              {[5, 10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={!currentUser}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-digis-cyan to-digis-pink text-white font-bold text-xs hover:scale-105 transition-all shadow-md shadow-digis-pink/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Stream Goals Widget - desktop only (mobile uses overlay above) */}
          {stream.goals && stream.goals.length > 0 && (
            <div className="hidden lg:block px-4 py-3 glass-dark border-t border-purple-400/30 backdrop-blur-xl shadow-[0_-2px_20px_rgba(168,85,247,0.15)]">
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
          <div className="w-full lg:w-96 flex-1 lg:flex-initial lg:h-auto glass-dark border-t lg:border-t-0 lg:border-l border-cyan-400/30 flex flex-col backdrop-blur-2xl shadow-[-4px_0_30px_rgba(34,211,238,0.15)] min-h-[300px]">
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

                {/* Message Input - extra padding on mobile for floating gift bar */}
                <div className="p-4 pb-20 lg:pb-4 border-t border-cyan-400/20 bg-gradient-to-r from-cyan-500/5 to-pink-500/5 backdrop-blur-xl">
                  {currentUser ? (
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

      {/* Floating Gift Bar */}
      {stream && !streamEnded && (
        <FloatingGiftBar
          streamId={streamId}
          creatorId={stream.creator.id}
          onSendGift={handleSendGift}
          userBalance={userBalance}
          isAuthenticated={!!currentUser}
          onAuthRequired={() => router.push(`/login?redirect=/live/${streamId}`)}
        />
      )}
    </div>
  );
}
