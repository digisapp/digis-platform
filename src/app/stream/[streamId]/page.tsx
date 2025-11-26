'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftSelector } from '@/components/streaming/GiftSelector';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { VideoControls } from '@/components/streaming/VideoControls';
import { QuickGiftButtons } from '@/components/streaming/QuickGiftButtons';
import { QuickEmojiReactions } from '@/components/streaming/QuickEmojiReactions';
import { EmojiReactionBurstSimple } from '@/components/streaming/EmojiReactionBurst';
import { ShareButton } from '@/components/streaming/ShareButton';
import { RealtimeService, StreamEvent } from '@/lib/streams/realtime-service';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Stream, StreamMessage, VirtualGift, StreamGift, StreamGoal } from '@/db/schema';

type StreamWithCreator = Stream & {
  creator?: {
    id: string;
    displayName: string | null;
    username: string | null;
  };
};

export default function StreamViewerPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const streamId = params.streamId as string;

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
  const [userBalance, setUserBalance] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [giftAnimations, setGiftAnimations] = useState<Array<{ gift: VirtualGift; streamGift: StreamGift }>>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);

  // Fetch stream details
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

  // Handle device orientation changes for mobile
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscapeOrientation = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(isLandscapeOrientation);
    };

    // Initial check
    handleOrientationChange();

    // Listen for orientation changes
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Join stream and setup real-time
  useEffect(() => {
    if (stream && !isJoined) {
      joinStream();
    }

    return () => {
      if (isJoined) {
        leaveStream();
      }
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
          alert('Stream has ended');
          router.push('/live');
          break;
        case 'reaction':
          setReactions(prev => [...prev, event.data]);
          break;
      }
    };

    const channel = RealtimeService.subscribeToStream(streamId, handleStreamEvent);

    return () => {
      RealtimeService.unsubscribeFromStream(streamId);
    };
  }, [stream, streamId, router]);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
      } else if (data.accessDenied) {
        // Access denied - show helpful UI with action buttons
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
      const response = await fetch(`/api/streams/${streamId}/messages`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages.reverse()); // Oldest first
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/leaderboard`);
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) {
        setUserBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/goals`);
      const data = await response.json();
      if (response.ok) {
        setGoals(data.goals);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  };

  const joinStream = async () => {
    try {
      // Join stream
      await fetch(`/api/streams/${streamId}/join`, { method: 'POST' });

      // Get viewer token
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
    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleSendGift = async (giftId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/streams/${streamId}/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, quantity }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send gift');
      }

      // Update balance
      fetchUserBalance();
    } catch (err: any) {
      throw err;
    }
  };

  const removeGiftAnimation = (index: number) => {
    setGiftAnimations((prev) => prev.filter((_, i) => i !== index));
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

  const handleFollowToggle = async () => {
    if (!stream?.creator?.id || followLoading) return;

    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/creators/${stream.creator.id}/follow`, {
        method,
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleFullscreen = () => {
    const videoContainer = document.querySelector('[data-lk-video-container]');
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleToggleTheater = () => {
    setIsTheaterMode(!isTheaterMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Handle access denied with actionable buttons
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Restricted</h1>
          <p className="text-gray-300 mb-6">{accessDenied.reason}</p>

          <div className="flex flex-col gap-3">
            {accessDenied.requiresSubscription && accessDenied.creatorUsername && (
              <GlassButton
                variant="gradient"
                size="lg"
                shimmer
                glow
                onClick={() => router.push(`/${accessDenied.creatorUsername}`)}
                className="w-full"
              >
                Subscribe to Watch
              </GlassButton>
            )}

            {accessDenied.requiresFollow && accessDenied.creatorUsername && (
              <GlassButton
                variant="gradient"
                size="lg"
                shimmer
                glow
                onClick={() => router.push(`/${accessDenied.creatorUsername}`)}
                className="w-full"
              >
                Follow to Watch
              </GlassButton>
            )}

            <GlassButton
              variant="ghost"
              size="lg"
              onClick={() => router.push('/live')}
              className="w-full"
            >
              Browse Other Streams
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'Stream not found'}</h1>
          <GlassButton variant="cyan" onClick={() => router.push('/live')}>
            Back to Live Streams
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Emoji Reactions Overlay */}
      <EmojiReactionBurstSimple reactions={reactions} onComplete={removeReaction} />

      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={giftAnimations} onRemove={removeGiftAnimation} />

      <div className={`${isTheaterMode ? 'max-w-screen-2xl' : 'container'} mx-auto px-4 py-6`}>
        <div className={`flex flex-col ${isTheaterMode ? 'lg:grid lg:grid-cols-4' : 'lg:grid lg:grid-cols-3'} gap-6`}>
          {/* Main Video Area */}
          <div className={`${isTheaterMode ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4 order-1`}>
            {/* Video Player */}
            <div
              className={`bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative ${
                isLandscape
                  ? 'aspect-video'
                  : 'aspect-video md:aspect-video'
              }`}
              data-lk-video-container
            >
              {token && serverUrl ? (
                <>
                  <LiveKitRoom
                    video={false}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    className="h-full"
                    options={{
                      adaptiveStream: true,
                      dynacast: true,
                    }}
                  >
                    <VideoConference />
                    <RoomAudioRenderer />
                  </LiveKitRoom>
                  <VideoControls
                    onToggleMute={handleToggleMute}
                    onToggleFullscreen={handleToggleFullscreen}
                    onToggleTheater={handleToggleTheater}
                    isMuted={isMuted}
                    isFullscreen={isFullscreen}
                    isTheaterMode={isTheaterMode}
                    showTheaterMode={true}
                  />
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Quick Emoji Reactions */}
              <QuickEmojiReactions
                streamId={streamId}
                onReaction={handleReaction}
              />

              <QuickGiftButtons
                streamId={streamId}
                onSendGift={handleSendGift}
                userBalance={userBalance}
              />
              <ShareButton
                streamTitle={stream.title}
                creatorName={stream.creator?.displayName || stream.creator?.username || 'Unknown'}
              />
            </div>

            {/* Stream Info */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white mb-2">{stream.title}</h1>
                  {stream.description && (
                    <p className="text-gray-400">{stream.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-500 font-bold">LIVE</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👤</span>
                    <span className="text-white font-semibold">{viewerCount} watching</span>
                    <span className="text-gray-500">· Peak: {peakViewers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="text-white">{stream.creator?.displayName || stream.creator?.username}</span>
                  </div>
                </div>

                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                      : 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 hover:scale-105'
                  } disabled:opacity-50`}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>

            {/* Active Goals */}
            {goals.length > 0 && <GoalProgressBar goals={goals} />}

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>🏆</span> Top Gifters
                </h3>
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div
                      key={entry.senderId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤'}
                        </span>
                        <span className="text-white font-semibold">
                          {entry.senderUsername}
                        </span>
                      </div>
                      <span className="text-digis-cyan font-bold">
                        {entry.totalCoins} coins
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1 space-y-4 order-2">
            <div className="h-[600px]">
              <StreamChat
                streamId={streamId}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </div>

            <GiftSelector
              streamId={streamId}
              onSendGift={handleSendGift}
              userBalance={userBalance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
