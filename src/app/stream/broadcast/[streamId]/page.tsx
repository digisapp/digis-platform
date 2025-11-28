'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { VideoPresets, Room } from 'livekit-client';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { SaveStreamModal } from '@/components/streaming/SaveStreamModal';
import { VideoControls } from '@/components/streaming/VideoControls';
import { ViewerList } from '@/components/streaming/ViewerList';
import { AlertManager, type Alert } from '@/components/streaming/AlertManager';
import { StreamHealthIndicator } from '@/components/streaming/StreamHealthIndicator';
import { EmojiReactionBurstSimple } from '@/components/streaming/EmojiReactionBurst';
import { RealtimeService, StreamEvent } from '@/lib/streams/realtime-service';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [hasManuallyEnded, setHasManuallyEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StreamGoal | null>(null);
  const [completedGoalIds, setCompletedGoalIds] = useState<Set<string>>(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showStreamSummary, setShowStreamSummary] = useState(false);
  const [showSaveStreamModal, setShowSaveStreamModal] = useState(false);
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
  const [isLandscape, setIsLandscape] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; timestamp: number }>>([]);

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
      // Only detect portrait mode on mobile devices (max-width: 768px)
      const isMobile = window.innerWidth <= 768;
      setIsPortrait(isMobile && window.innerHeight > window.innerWidth);
      const isLandscapeOrientation = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(isLandscapeOrientation);
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
        case 'reaction':
          setReactions(prev => [...prev, event.data]);
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
      }
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
      const response = await fetchWithRetry(`/api/streams/${streamId}/goals`, {
        retries: 3,
        backoffMs: 1000,
      });
      const data = await response.json();
      if (response.ok) {
        const newGoals = data.goals;

        // Check for newly completed goals
        newGoals.forEach((goal: StreamGoal) => {
          const isComplete = goal.currentAmount >= goal.targetAmount;
          const wasAlreadyCompleted = completedGoalIds.has(goal.id);

          if (isComplete && !wasAlreadyCompleted && goal.isActive) {
            // This goal was just completed!
            setCompletedGoalIds(prev => new Set(prev).add(goal.id));

            // Add celebration alert
            const celebrationAlert: Alert = {
              type: 'goalComplete',
              goal,
              id: `goal-${goal.id}-${Date.now()}`,
            };
            setAlerts(prev => [...prev, celebrationAlert]);
          }
        });

        setGoals(newGoals);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching goals:', err);
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
    // Add gift alert (sound will be played by GiftAlert component)
    const giftAlert: Alert = {
      type: 'gift',
      gift: data.gift,
      streamGift: data.streamGift,
      senderUsername: data.streamGift.senderUsername || 'Anonymous',
      id: `gift-${Date.now()}-${Math.random()}`,
    };
    setAlerts(prev => [...prev, giftAlert]);

    // Check if this is a big tip (500+ coins) for top tipper spotlight
    if (data.streamGift.totalCoins >= 500) {
      const topTipperAlert: Alert = {
        type: 'topTipper',
        username: data.streamGift.senderUsername || 'Anonymous',
        amount: data.streamGift.totalCoins,
        avatarUrl: null, // TODO: Get from user data
        id: `toptipper-${Date.now()}-${Math.random()}`,
      };
      // Add after a short delay so it doesn't overlap with gift alert
      setTimeout(() => {
        setAlerts(prev => [...prev, topTipperAlert]);
      }, 3500);
    }

    // Note: Sound is now handled by alert components (GiftAlert.tsx plays appropriate sound)

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

  const removeReaction = (id: string) => {
    setReactions(prev => prev.filter(r => r.id !== id));
  };

  const handleSendMessage = async (message: string) => {
    try {
      const payload = { content: message };
      console.log('[Broadcast] Sending message:', payload);

      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('Chat message error:', response.status, data);
        throw new Error(data.error || 'Failed to send message');
      }

      console.log('[Broadcast] Message sent successfully:', data);
    } catch (err: any) {
      console.error('[Broadcast] Send message failed:', err);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'Stream not found'}</h1>
          <GlassButton variant="gradient" onClick={() => router.push('/creator/dashboard')} shimmer glow className="text-white font-semibold">
            Back to Dashboard
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10">
      {/* Emoji Reactions Overlay */}
      <EmojiReactionBurstSimple reactions={reactions} onComplete={removeReaction} />

      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={giftAnimations} onRemove={removeGiftAnimation} />

      {/* Alert Manager - Handles gift alerts, top tipper spotlight, and goal celebrations */}
      <AlertManager
        alerts={alerts}
        onAlertComplete={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
      />

      {/* Set Goal Modal */}
      <SetGoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        streamId={streamId}
        onGoalCreated={() => {
          fetchGoals();
          setEditingGoal(null);
        }}
        existingGoal={editingGoal}
      />

      {/* End Stream Confirmation Modal */}
      {showEndConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => setShowEndConfirm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-6 max-w-sm w-full">
              <div className="space-y-3">
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={handleEndStream}
                  disabled={isEnding}
                  shimmer
                  glow
                  className="w-full text-white font-semibold bg-gradient-to-r from-red-600 to-pink-600"
                >
                  {isEnding ? 'Ending...' : 'End Stream'}
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={() => setShowEndConfirm(false)}
                  className="w-full font-semibold !text-white !bg-white/10 !border-white/40 hover:!bg-white/20"
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
            <div className="backdrop-blur-xl bg-slate-900/95 rounded-3xl border border-white/20 shadow-2xl p-8 max-w-2xl w-full">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Stream Complete!</h2>
                <p className="text-gray-200">Great job! Here's how your stream performed</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
                  <div className="mb-2">
                    <svg className="w-8 h-8 mx-auto text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-cyan-400">{streamSummary.duration}</div>
                  <div className="text-sm text-gray-200 font-medium">Duration</div>
                </div>
                <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
                  <div className="mb-2">
                    <svg className="w-8 h-8 mx-auto text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{streamSummary.totalViewers}</div>
                  <div className="text-sm text-gray-200 font-medium">Total Views</div>
                </div>
                <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
                  <div className="mb-2">
                    <svg className="w-8 h-8 mx-auto text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-pink-400">{streamSummary.peakViewers}</div>
                  <div className="text-sm text-gray-200 font-medium">Peak Viewers</div>
                </div>
                <div className="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 text-center">
                  <div className="mb-2">
                    <svg className="w-8 h-8 mx-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">{streamSummary.totalEarnings}</div>
                  <div className="text-sm text-gray-200 font-medium">Coins Earned</div>
                </div>
              </div>

              {/* Top Supporters */}
              {streamSummary.topSupporters.length > 0 && (
                <div className="mb-6 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Top Supporters
                  </h3>
                  <div className="space-y-2">
                    {streamSummary.topSupporters.map((supporter, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-white">{supporter.username}</span>
                        </div>
                        <span className="text-cyan-400 font-bold">{supporter.totalCoins} coins</span>
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
                  onClick={() => setShowSaveStreamModal(true)}
                  shimmer
                  glow
                  className="w-full !text-white font-semibold"
                >
                  Save Stream Replay
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push('/creator/dashboard')}
                  className="w-full font-semibold !text-white !bg-white/10 !border-white/40 hover:!bg-white/20"
                >
                  Back to Dashboard
                </GlassButton>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Stats Bar */}
      <div className="backdrop-blur-xl bg-white/10 border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
              <div className="relative flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/10 rounded-lg border border-red-500 overflow-hidden">
                {/* Animated gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-pink-500 to-red-500 opacity-20 animate-pulse" />
                <div className="relative flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
                  <span className="text-red-400 font-bold">LIVE</span>
                  <span className="text-white ml-2 font-semibold">{formatDuration()}</span>
                </div>
              </div>

              <ViewerList streamId={streamId} currentViewers={viewerCount} />

              <StreamHealthIndicator streamId={streamId} />

              {/* Coins Display - Enhanced */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-400/30">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-400 font-bold text-lg">{totalEarnings.toLocaleString()}</span>
                <span className="text-yellow-200 text-sm font-semibold">coins</span>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <GlassButton
                variant="gradient"
                size="md"
                onClick={() => {
                  // Check if there's already an active goal
                  const hasActiveGoal = goals.some(g => g.isActive && !g.isCompleted);
                  if (hasActiveGoal) {
                    alert('You already have an active goal. Please edit or end the existing goal before creating a new one.');
                    return;
                  }
                  setEditingGoal(null); // Ensure we're creating new, not editing
                  setShowGoalModal(true);
                }}
                shimmer
                className="text-white font-semibold flex-1 sm:flex-initial px-3 py-2 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="hidden sm:inline">Set Goal</span>
              </GlassButton>
              <GlassButton
                variant="gradient"
                size="md"
                onClick={() => setShowEndConfirm(true)}
                shimmer
                glow
                className="text-white font-semibold flex-1 sm:flex-initial px-3 py-2 flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span className="hidden sm:inline">End Stream</span>
              </GlassButton>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className={`grid grid-cols-1 ${isPortrait ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
          {/* Main Video Area */}
          <div className={`${isPortrait ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-4`}>
            {/* Stream Title */}
            <h1 className="text-2xl font-bold text-white px-2">{stream.title}</h1>

            {/* Video Player */}
            <div
              className={`bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative ${
                isPortrait
                  ? 'aspect-[9/16]'
                  : 'aspect-video'
              }`}
              data-lk-video-container
            >
              {token && serverUrl ? (
                <>
                  <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={serverUrl}
                    className="h-full"
                    options={{
                      adaptiveStream: true,
                      dynacast: true,
                      videoCaptureDefaults: {
                        resolution: VideoPresets.h1440,
                        facingMode: 'user',
                      },
                      publishDefaults: {
                        videoSimulcastLayers: [
                          VideoPresets.h1440, // 2K (1440p) for premium viewers
                          VideoPresets.h1080, // 1080p for high-quality
                          VideoPresets.h720,  // 720p for medium quality
                          VideoPresets.h360,  // 360p for low bandwidth
                        ],
                        videoEncoding: {
                          maxBitrate: 8_000_000, // 8 Mbps for 2K quality
                          maxFramerate: 30,
                        },
                        dtx: true,
                        red: true,
                      },
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
                    showTheaterMode={false}
                  />
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>

            {/* Active Goals */}
            {goals.length > 0 && (
              <GoalProgressBar
                goals={goals}
                isBroadcaster={true}
                streamId={streamId}
                onEdit={(goal) => {
                  setEditingGoal(goal);
                  setShowGoalModal(true);
                }}
                onGoalEnded={fetchGoals}
              />
            )}

            {/* Top Gifters Leaderboard - Desktop only (in video column) */}
            <div className="hidden lg:block backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4 max-w-md">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Top Gifters
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {leaderboard.length > 0 ? (
                  leaderboard.map((supporter, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold w-8" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9CA3AF' }}>
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-white">{supporter.username}</span>
                      </div>
                      <span className="text-cyan-400 font-bold">{supporter.totalCoins} coins</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-300">
                    <div className="mb-3">
                      <svg className="w-12 h-12 mx-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-white font-medium">No gifts yet!</p>
                    <p className="text-sm mt-1">Be the first to support this stream</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <div className={`${isPortrait ? 'h-[210px]' : 'h-[calc(70vh-8.4rem)]'} lg:sticky lg:top-24`}>
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

        {/* Top Gifters Leaderboard - Mobile only (below chat) */}
        <div className="lg:hidden mt-4 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Top Gifters
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {leaderboard.length > 0 ? (
              leaderboard.map((supporter, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-8" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9CA3AF' }}>
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-white">{supporter.username}</span>
                  </div>
                  <span className="text-cyan-400 font-bold">{supporter.totalCoins} coins</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-300">
                <div className="mb-3">
                  <svg className="w-12 h-12 mx-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-white font-medium">No gifts yet!</p>
                <p className="text-sm mt-1">Be the first to support this stream</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Save Stream Modal */}
      {stream && (
        <SaveStreamModal
          isOpen={showSaveStreamModal}
          onClose={() => setShowSaveStreamModal(false)}
          streamId={streamId}
          streamTitle={stream.title}
          streamDescription={stream.description || undefined}
          onSaved={(vodId) => {
            console.log('Stream saved as VOD:', vodId);
            // Optionally show success message or redirect
            alert('Stream saved successfully! You can find it in your VOD library.');
          }}
        />
      )}

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
