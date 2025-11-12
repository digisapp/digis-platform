'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { VideoControls } from '@/components/streaming/VideoControls';
import { ViewerList } from '@/components/streaming/ViewerList';
import { RealtimeService, StreamEvent } from '@/lib/streams/realtime-service';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Stream, StreamMessage, VirtualGift, StreamGift, StreamGoal } from '@/db/schema';

export default function BroadcastStudioPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const streamId = params.streamId as string;

  const [stream, setStream] = useState<Stream | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [giftAnimations, setGiftAnimations] = useState<Array<{ gift: VirtualGift; streamGift: StreamGift }>>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [hasManuallyEnded, setHasManuallyEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showStreamSummary, setShowStreamSummary] = useState(false);
  const [streamSummary, setStreamSummary] = useState<{
    duration: string;
    totalViewers: number;
    peakViewers: number;
    totalEarnings: number;
    topSupporters: Array<{ username: string; totalCoins: number }>;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; totalCoins: number }>>([]);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch stream details and token
  useEffect(() => {
    fetchStreamDetails();
    fetchMessages();
    fetchBroadcastToken();
    fetchGoals();
    fetchLeaderboard();
  }, [streamId]);

  // Check orientation on mount and window resize
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Auto-end stream on navigation or browser close
  useEffect(() => {
    if (!stream || stream.status !== 'live') return;

    let isEnding = false;

    const endStreamCleanup = async () => {
      // Skip if user manually ended the stream
      if (hasManuallyEnded || isEnding) return;
      isEnding = true;

      try {
        await fetch(`/api/streams/${streamId}/end`, {
          method: 'POST',
          keepalive: true, // Important for beforeunload
        });
      } catch (err) {
        console.error('Failed to auto-end stream:', err);
      }
    };

    // Handle browser close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      endStreamCleanup();
      // Modern browsers ignore custom messages, but we still need to return a value
      e.preventDefault();
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on component unmount (navigation away)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endStreamCleanup();
    };
  }, [stream, streamId, hasManuallyEnded]);

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
          setTotalEarnings((prev) => prev + event.data.streamGift.totalCoins);
          // Show gift notification
          showGiftNotification(event.data);
          // Update goals progress and leaderboard
          fetchGoals();
          fetchLeaderboard();
          break;
        case 'viewer_joined':
          playSound('join');
          break;
        case 'viewer_count':
          setViewerCount(event.data.currentViewers);
          setPeakViewers(event.data.peakViewers);
          break;
      }
    };

    const channel = RealtimeService.subscribeToStream(streamId, handleStreamEvent);

    return () => {
      RealtimeService.unsubscribeFromStream(streamId);
    };
  }, [stream, streamId]);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
        setTotalEarnings(data.stream.totalGiftsReceived);
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
        setMessages(data.messages.reverse());
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const fetchBroadcastToken = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/broadcast-token`);
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } else {
        setError(data.error || 'Not authorized to broadcast');
      }
    } catch (err) {
      setError('Failed to get broadcast token');
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

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/leaderboard`);
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const handleEndStream = async () => {
    setIsEnding(true);
    setHasManuallyEnded(true); // Prevent auto-end from triggering

    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        // Fetch stream summary data
        await fetchStreamSummary();
        setShowEndConfirm(false);
        setShowStreamSummary(true);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to end stream');
        setHasManuallyEnded(false); // Reset if failed
        setShowEndConfirm(false);
      }
    } catch (err) {
      alert('Failed to end stream');
      setHasManuallyEnded(false); // Reset if failed
      setShowEndConfirm(false);
    } finally {
      setIsEnding(false);
    }
  };

  const fetchStreamSummary = async () => {
    try {
      // Fetch final stream data
      const streamResponse = await fetch(`/api/streams/${streamId}`);
      const streamData = await streamResponse.json();

      // Fetch top supporters
      const leaderboardResponse = await fetch(`/api/streams/${streamId}/leaderboard`);
      const leaderboardData = await leaderboardResponse.json();

      if (streamResponse.ok) {
        const finalStream = streamData.stream;
        const duration = finalStream.durationSeconds
          ? formatDurationFromSeconds(finalStream.durationSeconds)
          : formatDuration();

        setStreamSummary({
          duration,
          totalViewers: finalStream.totalViews || 0,
          peakViewers: finalStream.peakViewers || 0,
          totalEarnings: finalStream.totalGiftsReceived || 0,
          topSupporters: leaderboardData.leaderboard?.slice(0, 3) || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch stream summary:', err);
    }
  };

  const formatDurationFromSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const showGiftNotification = (data: { gift: VirtualGift; streamGift: StreamGift }) => {
    // Play sound with gift value for enhanced audio
    playSound('gift', data.streamGift.totalCoins);

    // Could add a toast notification here
    console.log(`${data.streamGift.senderUsername} sent ${data.gift.emoji} ${data.gift.name}!`);
  };

  const playSound = (type: 'join' | 'gift', giftValue?: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);

      if (type === 'gift') {
        // Enhanced celebratory sound for gifts with chord progression
        // Volume based on gift value
        const baseVolume = giftValue && giftValue > 100 ? 0.4 : 0.3;

        // Play a major chord (C-E-G for happy feeling)
        const frequencies = giftValue && giftValue > 100
          ? [523.25, 659.25, 783.99, 1046.50] // C5-E5-G5-C6 (bigger gift)
          : [523.25, 659.25, 783.99]; // C5-E5-G5 (normal gift)

        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          oscillator.type = 'sine';
          oscillator.connect(gainNode);

          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
          gainNode.gain.setValueAtTime(baseVolume / frequencies.length, audioContext.currentTime + index * 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8 + index * 0.05);

          oscillator.start(audioContext.currentTime + index * 0.05);
          oscillator.stop(audioContext.currentTime + 0.8 + index * 0.05);
        });

        // Add a sparkle effect for big gifts
        if (giftValue && giftValue > 100) {
          setTimeout(() => {
            const sparkle = audioContext.createOscillator();
            sparkle.type = 'sine';
            const sparkleGain = audioContext.createGain();
            sparkle.connect(sparkleGain);
            sparkleGain.connect(audioContext.destination);

            sparkle.frequency.setValueAtTime(2093, audioContext.currentTime); // High C
            sparkleGain.gain.setValueAtTime(0.2, audioContext.currentTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            sparkle.start(audioContext.currentTime);
            sparkle.stop(audioContext.currentTime + 0.3);
          }, 200);
        }
      } else if (type === 'join') {
        // Subtle, welcoming join sound
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.connect(gainNode);

        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
    } catch (err) {
      console.log('Audio not supported');
    }
  };

  const removeGiftAnimation = (index: number) => {
    setGiftAnimations((prev) => prev.filter((_, i) => i !== index));
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

  const formatDuration = () => {
    if (!stream?.startedAt) return '0:00';
    const start = new Date(stream.startedAt);
    const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // Note: Muting is handled by volume control in VideoControls
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
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center p-4">
        <div className="glass rounded-2xl border-2 border-purple-200 p-8 text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error || 'Stream not found'}</h1>
          <GlassButton variant="gradient" onClick={() => router.push('/creator/dashboard')} shimmer glow className="text-white font-semibold">
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={giftAnimations} onRemove={removeGiftAnimation} />

      {/* Set Goal Modal */}
      <SetGoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        streamId={streamId}
        onGoalCreated={fetchGoals}
      />

      {/* End Stream Confirmation Modal */}
      {showEndConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => setShowEndConfirm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl border-2 border-purple-200 shadow-2xl p-8 max-w-md w-full">
              <div className="mb-6 bg-gradient-to-r from-digis-pink/10 to-digis-purple/10 rounded-2xl p-4 border border-purple-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">End Stream?</h3>
                <p className="text-gray-700">
                  Are you sure you want to end this stream? Your viewers will be disconnected.
                </p>
              </div>
              <div className="space-y-3">
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={handleEndStream}
                  disabled={isEnding}
                  shimmer
                  glow
                  className="w-full text-white font-semibold"
                >
                  {isEnding ? 'Ending...' : 'Yes, End Stream'}
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full text-gray-900 font-semibold"
                >
                  Cancel
                </GlassButton>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stream Summary Modal */}
      {showStreamSummary && streamSummary && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl border-2 border-purple-200 shadow-2xl p-8 max-w-2xl w-full">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Stream Complete!</h2>
                <p className="text-gray-700">Great job! Here's how your stream performed</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center">
                  <div className="text-3xl mb-2">⏱️</div>
                  <div className="text-2xl font-bold text-digis-cyan">{streamSummary.duration}</div>
                  <div className="text-sm text-gray-700 font-medium">Duration</div>
                </div>
                <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center">
                  <div className="text-3xl mb-2">👁️</div>
                  <div className="text-2xl font-bold text-digis-purple">{streamSummary.totalViewers}</div>
                  <div className="text-sm text-gray-700 font-medium">Total Views</div>
                </div>
                <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="text-2xl font-bold text-digis-pink">{streamSummary.peakViewers}</div>
                  <div className="text-sm text-gray-700 font-medium">Peak Viewers</div>
                </div>
                <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center">
                  <div className="text-3xl mb-2">💰</div>
                  <div className="text-2xl font-bold text-yellow-500">{streamSummary.totalEarnings}</div>
                  <div className="text-sm text-gray-700 font-medium">Coins Earned</div>
                </div>
              </div>

              {/* Top Supporters */}
              {streamSummary.topSupporters.length > 0 && (
                <div className="mb-6 glass rounded-xl border-2 border-purple-200 p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🏆</span> Top Supporters
                  </h3>
                  <div className="space-y-2">
                    {streamSummary.topSupporters.map((supporter, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                          <span className="font-semibold text-gray-900">{supporter.username}</span>
                        </div>
                        <span className="text-digis-cyan font-bold">{supporter.totalCoins} coins</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={() => {
                    // TODO: Implement share functionality
                    alert('Share highlights feature coming soon!');
                  }}
                  shimmer
                  glow
                  className="w-full text-white font-semibold"
                >
                  📤 Share Highlights
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push('/creator/dashboard')}
                  className="w-full text-gray-900 font-semibold"
                >
                  Back to Dashboard
                </GlassButton>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Stats Bar */}
      <div className="glass backdrop-blur-md border-b-2 border-purple-200 sticky top-0 z-40">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <div className="relative flex items-center gap-2 px-4 py-2 glass rounded-lg border-2 border-red-500 overflow-hidden">
                {/* Animated gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-pink-500 to-red-500 opacity-20 animate-pulse" />
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r from-red-500 via-pink-500 to-red-500 animate-gradient-x opacity-50"
                     style={{ WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
                <div className="relative flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-600 font-bold">LIVE</span>
                  <span className="text-gray-900 ml-2 font-semibold">{formatDuration()}</span>
                </div>
              </div>

              <ViewerList streamId={streamId} currentViewers={viewerCount} />

              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border-2 border-purple-200">
                <span className="text-2xl">💰</span>
                <span className="text-gray-900 font-bold">{totalEarnings} coins</span>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <GlassButton
                variant="gradient"
                size="lg"
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                shimmer
                className="text-white font-semibold flex-1 sm:flex-initial min-h-[44px]"
              >
                <span className="hidden sm:inline">🏆 Leaderboard</span>
                <span className="sm:hidden">🏆</span>
              </GlassButton>
              <GlassButton
                variant="gradient"
                size="lg"
                onClick={() => setShowGoalModal(true)}
                shimmer
                className="text-white font-semibold flex-1 sm:flex-initial min-h-[44px]"
              >
                <span className="hidden sm:inline">🎯 Set Goal</span>
                <span className="sm:hidden">🎯</span>
              </GlassButton>
              <GlassButton
                variant="gradient"
                size="lg"
                onClick={() => setShowEndConfirm(true)}
                shimmer
                glow
                className="text-white font-semibold flex-1 sm:flex-initial min-h-[44px]"
              >
                <span className="hidden sm:inline">End Stream</span>
                <span className="sm:hidden">🛑</span>
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Sidebar (Mobile Drawer / Desktop Sidebar) */}
      {showLeaderboard && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setShowLeaderboard(false)} />
          <div className={`fixed ${isPortrait ? 'bottom-0 left-0 right-0 max-h-[70vh]' : 'right-0 top-0 bottom-0 w-80'} bg-white/95 backdrop-blur-md border-l-2 border-purple-200 z-40 lg:relative lg:z-0 transform transition-transform duration-300 ${showLeaderboard ? 'translate-x-0 translate-y-0' : isPortrait ? 'translate-y-full' : 'translate-x-full'} lg:translate-x-0 lg:translate-y-0 overflow-y-auto`}>
            <div className="p-4 border-b-2 border-purple-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🏆</span> Top Gifters
              </h3>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="lg:hidden text-gray-600 hover:text-gray-900 p-2 min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((supporter, index) => (
                  <div key={index} className="glass rounded-xl border-2 border-purple-200 p-4 hover:border-digis-cyan transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </span>
                        <div>
                          <div className="font-bold text-gray-900">{supporter.username}</div>
                          <div className="text-xs text-gray-600">Supporter</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-digis-cyan">{supporter.totalCoins}</div>
                        <div className="text-xs text-gray-600">coins</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <div className="text-4xl mb-2">🎁</div>
                  <p>No gifts yet!</p>
                  <p className="text-sm mt-2">Be the first to support this stream</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Portrait Mode Indicator */}
      {isPortrait && (
        <div className="bg-gradient-to-r from-digis-cyan/20 to-digis-purple/20 border-b-2 border-purple-200 px-4 py-2 text-center">
          <p className="text-sm text-gray-800 font-semibold">
            📱 Portrait Mode Active - Optimized for vertical streaming
          </p>
        </div>
      )}

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className={`grid grid-cols-1 ${isPortrait ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
          {/* Main Video Area */}
          <div className={`${isPortrait ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-4`}>
            {/* Video Player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative" data-lk-video-container>
              {token && serverUrl ? (
                <>
                  <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    className="h-full"
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
                    showTheaterMode={false}
                  />
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>

            {/* Stream Info */}
            <div className="glass rounded-2xl border-2 border-purple-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{stream.title}</h1>
              {stream.description && (
                <p className="text-gray-700">{stream.description}</p>
              )}
            </div>

            {/* Active Goals */}
            {goals.length > 0 && <GoalProgressBar goals={goals} />}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center hover:border-digis-cyan transition-all duration-300 hover:shadow-lg min-h-[100px] flex flex-col justify-center">
                <div className="text-3xl mb-2">👁️</div>
                <div className="text-xl sm:text-2xl font-bold text-digis-cyan">{stream.totalViews}</div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium">Total Views</div>
              </div>
              <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center hover:border-digis-pink transition-all duration-300 hover:shadow-lg min-h-[100px] flex flex-col justify-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-xl sm:text-2xl font-bold text-digis-pink">{peakViewers}</div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium">Peak Viewers</div>
              </div>
              <div className="glass rounded-xl border-2 border-purple-200 p-4 text-center hover:border-yellow-400 transition-all duration-300 hover:shadow-lg min-h-[100px] flex flex-col justify-center">
                <div className="text-3xl mb-2">🎁</div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-500">{totalEarnings}</div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium">Coins Earned</div>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className={`${isPortrait ? 'lg:col-span-1 order-first' : 'lg:col-span-1'}`}>
            <div className={`${isPortrait ? 'h-[300px]' : 'h-[calc(100vh-12rem)]'} lg:sticky lg:top-24`}>
              <StreamChat
                streamId={streamId}
                messages={messages}
                isCreator={true}
                onSendMessage={handleSendMessage}
                onMessageDeleted={fetchMessages}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animated gradient border */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
