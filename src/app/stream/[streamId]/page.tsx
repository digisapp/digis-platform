'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftSelector } from '@/components/streaming/GiftSelector';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { QuickEmojiReactions } from '@/components/streaming/QuickEmojiReactions';
import { EmojiReactionBurstSimple } from '@/components/streaming/EmojiReactionBurst';
import { RealtimeService, StreamEvent } from '@/lib/streams/realtime-service';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
import {
  Volume2, VolumeX, Maximize, Minimize, Users, Heart, Share2,
  MessageCircle, Gift, ChevronDown, ChevronUp, X, Coins, Crown,
  Zap, Eye, TrendingUp, ExternalLink
} from 'lucide-react';
import type { Stream, StreamMessage, VirtualGift, StreamGift, StreamGoal } from '@/db/schema';

type StreamWithCreator = Stream & {
  creator?: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl?: string | null;
  };
  orientation?: 'landscape' | 'portrait';
};

export default function StreamViewerPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
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
  } | null>(null);

  // User state
  const [userBalance, setUserBalance] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Stream stats
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [goals, setGoals] = useState<StreamGoal[]>([]);

  // UI state
  const [isMuted, setIsMuted] = useState(true); // Start muted (browser requirement)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Animations
  const [giftAnimations, setGiftAnimations] = useState<Array<{ gift: VirtualGift; streamGift: StreamGift }>>([]);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);

  // Check mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all data
  useEffect(() => {
    fetchStreamDetails();
    fetchMessages();
    fetchLeaderboard();
    fetchUserBalance();
    fetchGoals();
  }, [streamId]);

  // Check follow status when stream loads
  useEffect(() => {
    if (stream?.creator?.id) {
      fetchFollowStatus();
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

  // Setup real-time subscriptions
  useEffect(() => {
    if (!stream) return;

    const handleStreamEvent = (event: StreamEvent) => {
      switch (event.type) {
        case 'chat':
          setMessages((prev) => [...prev, event.data]);
          break;
        case 'gift':
          setGiftAnimations((prev) => [...prev, event.data]);
          fetchLeaderboard();
          fetchGoals();
          break;
        case 'viewer_count':
          setViewerCount(event.data.currentViewers);
          setPeakViewers(event.data.peakViewers);
          break;
        case 'stream_ended':
          router.push('/live');
          break;
        case 'reaction':
          setReactions(prev => [...prev, event.data]);
          break;
      }
    };

    RealtimeService.subscribeToStream(streamId, handleStreamEvent);
    return () => {
      RealtimeService.unsubscribeFromStream(streamId);
    };
  }, [stream, streamId, router]);

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
      } else if (data.accessDenied) {
        setAccessDenied({
          reason: data.error,
          creatorId: data.creatorId,
          creatorUsername: data.creatorUsername,
          requiresSubscription: data.requiresSubscription,
          requiresFollow: data.requiresFollow,
        });
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
    const response = await fetch(`/api/streams/${streamId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to send message');
    }
  };

  const handleSendGift = async (giftId: string, quantity: number) => {
    const response = await fetch(`/api/streams/${streamId}/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId, quantity }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send gift');
    }
    fetchUserBalance();
  };

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

  const handleReaction = async (emoji: string) => {
    try {
      await fetch(`/api/streams/${streamId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
    } catch (error) {
      console.error('Error sending reaction:', error);
    }
  };

  const removeReaction = useCallback((id: string) => {
    setReactions(prev => prev.filter(r => r.id !== id));
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
    const text = `Watch ${stream?.creator?.displayName || stream?.creator?.username} live on Digis!`;
    if (navigator.share) {
      await navigator.share({ title: stream?.title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied!');
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

  // Access denied state
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 md:pl-20">
        <div className="max-w-md w-full text-center glass rounded-3xl p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-digis-pink/20 to-digis-cyan/20 flex items-center justify-center">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Required</h1>
          <p className="text-gray-400 mb-8">{accessDenied.reason}</p>
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
      {/* Emoji Reactions Overlay */}
      <EmojiReactionBurstSimple reactions={reactions} onComplete={removeReaction} />

      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={giftAnimations} onRemove={removeGiftAnimation} />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Video Section */}
        <div className={`flex-1 flex flex-col ${showChat && !isMobile ? 'lg:mr-[400px]' : ''}`}>
          {/* Video Player Container */}
          <div
            ref={videoContainerRef}
            className="relative flex-1 bg-black"
            onMouseMove={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onClick={() => isMobile && setShowControls(!showControls)}
          >
            {/* LiveKit Video */}
            {token && serverUrl ? (
              <LiveKitRoom
                video={false}
                audio={true}
                token={token}
                serverUrl={serverUrl}
                className="h-full w-full"
                options={{ adaptiveStream: true, dynacast: true }}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            ) : (
              <div className="h-full flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* Video Overlay - Top Gradient */}
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

            {/* Video Overlay - Bottom Gradient */}
            <div className={`absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

            {/* Top Bar - Creator Info & Stats */}
            <div className={`absolute top-0 left-0 right-0 p-4 flex items-start justify-between transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              {/* Creator Info */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push(`/${stream.creator?.username}`)}
                  className="relative group"
                >
                  {stream.creator?.avatarUrl ? (
                    <img src={stream.creator.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500 ring-offset-2 ring-offset-black" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold ring-2 ring-red-500 ring-offset-2 ring-offset-black">
                      {stream.creator?.displayName?.[0] || stream.creator?.username?.[0] || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{stream.creator?.displayName || stream.creator?.username}</span>
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

            {/* Bottom Controls */}
            <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Stream Title */}
              <h1 className="text-lg md:text-xl font-bold text-white mb-3 line-clamp-1">{stream.title}</h1>

              {/* Active Goal (if any) */}
              {goals.length > 0 && goals.some(g => g.isActive && !g.isCompleted) && (
                <div className="mb-3">
                  {goals.filter(g => g.isActive && !g.isCompleted).slice(0, 1).map(goal => (
                    <div key={goal.id} className="bg-black/60 backdrop-blur-sm rounded-xl p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/80">{goal.description}</span>
                        <span className="text-digis-cyan font-bold">{goal.currentAmount}/{goal.targetAmount}</span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-digis-cyan to-digis-pink transition-all duration-500"
                          style={{ width: `${Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

                {/* Center: Quick Reactions */}
                <div className="flex-1 flex justify-center">
                  <QuickEmojiReactions streamId={streamId} onReaction={handleReaction} />
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
                  <button
                    onClick={toggleFullscreen}
                    className="p-3 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Chat Toggle */}
            {isMobile && (
              <button
                onClick={() => setShowMobileChat(true)}
                className={`absolute bottom-20 right-4 p-3 bg-black/60 backdrop-blur-sm rounded-full transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
              >
                <MessageCircle className="w-6 h-6" />
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-digis-pink rounded-full text-xs font-bold flex items-center justify-center">
                    {messages.length > 99 ? '99+' : messages.length}
                  </span>
                )}
              </button>
            )}
          </div>

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

        {/* Mobile Chat Overlay */}
        {isMobile && showMobileChat && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-digis-cyan" />
                <span className="font-bold">Live Chat</span>
              </div>
              <button onClick={() => setShowMobileChat(false)} className="p-2 bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat */}
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
                    <p className="text-sm text-gray-400">Support {stream.creator?.displayName || stream.creator?.username}</p>
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
                  onSendGift={async (giftId, qty) => {
                    await handleSendGift(giftId, qty);
                    setShowGiftPanel(false);
                  }}
                  userBalance={userBalance}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
