'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, VideoTrack } from '@livekit/components-react';
import { VideoPresets, Room, Track } from 'livekit-client';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { SaveStreamModal } from '@/components/streaming/SaveStreamModal';
import { VideoControls } from '@/components/streaming/VideoControls';
import { ViewerList } from '@/components/streaming/ViewerList';
import { AlertManager, type Alert } from '@/components/streaming/AlertManager';
import { StreamHealthIndicator } from '@/components/streaming/StreamHealthIndicator';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { FeaturedCreatorsPanel } from '@/components/streaming/FeaturedCreatorsPanel';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { useStreamChat } from '@/hooks/useStreamChat';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
import { Coins, MessageCircle, UserPlus, RefreshCw, Users, Target } from 'lucide-react';
import type { Stream, StreamMessage, VirtualGift, StreamGift, StreamGoal } from '@/db/schema';

// Component to show only the local camera preview (no participant tiles/placeholders)
function LocalCameraPreview({ isPortrait = false }: { isPortrait?: boolean }) {
  const { localParticipant } = useLocalParticipant();

  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);

  if (!cameraTrack || !cameraTrack.track) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">Starting camera...</p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={{ participant: localParticipant, source: Track.Source.Camera, publication: cameraTrack }}
      className={`h-full w-full ${isPortrait ? 'object-cover' : 'object-contain'}`}
    />
  );
}

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
  const [isLeaveAttempt, setIsLeaveAttempt] = useState(false); // true = accidental navigation, false = intentional end
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
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; senderId: string; totalCoins: number }>>([]);
  const [isPortraitDevice, setIsPortraitDevice] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [streamOrientation, setStreamOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>>([]);
  const [isSafari, setIsSafari] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlippingCamera, setIsFlippingCamera] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<StreamMessage | null>(null);

  // Detect Safari browser
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isSafariBrowser = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
    setIsSafari(isSafariBrowser);
  }, []);

  // Prevent accidental navigation away from stream (swipe, back button, refresh, keyboard shortcuts)
  useEffect(() => {
    // Only add prevention if stream is active and not manually ended
    if (!stream || stream.status !== 'live' || hasManuallyEnded) return;

    // Prevent browser back/forward navigation
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Push state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
      setIsLeaveAttempt(true);
      setShowEndConfirm(true);
    };

    // Prevent page refresh/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are currently streaming. Are you sure you want to leave?';
      return e.returnValue;
    };

    // Prevent keyboard shortcuts that navigate away (Cmd+Left, Alt+Left, Backspace, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Left Arrow (go back) or Cmd/Ctrl + Right Arrow (go forward)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setIsLeaveAttempt(true);
        setShowEndConfirm(true);
        return;
      }
      // Alt + Left Arrow (go back in some browsers)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setIsLeaveAttempt(true);
        setShowEndConfirm(true);
        return;
      }
      // Backspace when not in an input (some browsers navigate back)
      if (e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
        }
      }
    };

    // Prevent swipe gestures on touch devices
    const handleTouchStart = (e: TouchEvent) => {
      // Store the initial touch position
      const touch = e.touches[0];
      (window as any).__streamTouchStartX = touch.clientX;
      (window as any).__streamTouchStartY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!('__streamTouchStartX' in window)) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - (window as any).__streamTouchStartX;
      const deltaY = touch.clientY - (window as any).__streamTouchStartY;

      // If horizontal swipe is greater than vertical (potential back gesture)
      // and starts from left edge, prevent it
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 50 && (window as any).__streamTouchStartX < 30) {
        e.preventDefault();
      }
    };

    // Prevent mouse wheel horizontal navigation (trackpad two-finger swipe)
    const handleWheel = (e: WheelEvent) => {
      // Large horizontal scroll with minimal vertical = likely trackpad swipe gesture
      if (Math.abs(e.deltaX) > 50 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2) {
        // Check if we're at the edge of scrollable content (where browser would navigate)
        const target = e.target as HTMLElement;
        const scrollable = target.closest('[data-scrollable]') || document.scrollingElement;

        if (scrollable) {
          const atLeftEdge = scrollable.scrollLeft === 0;
          const atRightEdge = scrollable.scrollLeft >= scrollable.scrollWidth - scrollable.clientWidth;

          // If at edge and swiping in direction that would navigate, prevent it
          if ((atLeftEdge && e.deltaX < 0) || (atRightEdge && e.deltaX > 0)) {
            e.preventDefault();
          }
        }
      }
    };

    // Push initial state to enable popstate detection
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      delete (window as any).__streamTouchStartX;
      delete (window as any).__streamTouchStartY;
    };
  }, [stream, hasManuallyEnded]);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Send heartbeat every 30 seconds to keep stream alive
  useEffect(() => {
    if (!stream || stream.status !== 'live') return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/streams/${streamId}/heartbeat`, { method: 'POST' });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    // Send immediately and then every 30 seconds
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(interval);
  }, [stream, streamId]);

  // Fetch stream details and token
  useEffect(() => {
    fetchStreamDetails();
    fetchMessages();
    fetchBroadcastToken();
    fetchGoals();
    fetchLeaderboard();
  }, [streamId]);

  // Check device orientation on mount and window resize
  useEffect(() => {
    const checkOrientation = () => {
      // Only detect portrait mode on mobile devices (max-width: 768px)
      const isMobile = window.innerWidth <= 768;
      setIsPortraitDevice(isMobile && window.innerHeight > window.innerWidth);
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

    let hasCleanedUp = false;

    const endStreamCleanup = () => {
      // Skip if user manually ended the stream or already cleaned up
      if (hasManuallyEnded || hasCleanedUp) return;
      hasCleanedUp = true;

      // Use sendBeacon for reliable delivery during page unload
      // This is more reliable than fetch with keepalive
      const url = `/api/streams/${streamId}/end`;
      const success = navigator.sendBeacon(url);
      if (!success) {
        // Fallback to fetch if sendBeacon fails
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    // Handle browser close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      endStreamCleanup();
      // Show confirmation dialog to warn user
      e.preventDefault();
      return '';
    };

    // Handle visibility change (user switches tabs or minimizes browser)
    const handleVisibilityChange = () => {
      // Only end if document is hidden for a while (handled by heartbeat timeout instead)
      // This is just for logging/debugging
      if (document.visibilityState === 'hidden') {
        console.log('[Broadcast] Tab hidden, heartbeat will keep stream alive');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on component unmount (navigation away)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endStreamCleanup();
    };
  }, [stream, streamId, hasManuallyEnded]);

  // Setup real-time subscriptions with Ably
  const { viewerCount: ablyViewerCount } = useStreamChat({
    streamId,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message as unknown as StreamMessage]);
    },
    onGift: (giftEvent) => {
      const giftData = {
        gift: giftEvent.gift as unknown as VirtualGift,
        streamGift: giftEvent.streamGift as unknown as StreamGift
      };
      setGiftAnimations((prev) => [...prev, giftData]);
      setTotalEarnings((prev) => prev + (giftEvent.streamGift.quantity || 1) * (giftEvent.gift.coinCost || 0));
      // Show gift notification
      showGiftNotification(giftData);
      // Add floating emoji for the gift
      if (giftEvent.gift) {
        setFloatingGifts(prev => [...prev, {
          id: `gift-${Date.now()}-${Math.random()}`,
          emoji: giftEvent.gift.emoji,
          rarity: giftEvent.gift.rarity,
          timestamp: Date.now(),
          giftName: giftEvent.gift.name  // Include gift name for specific sounds
        }]);
      }
      // Update goals progress and leaderboard
      fetchGoals();
      fetchLeaderboard();
    },
    onTip: (tipData) => {
      setTotalEarnings((prev) => prev + tipData.amount);
      fetchLeaderboard();

      // Add floating coin emoji for visual feedback
      setFloatingGifts(prev => [...prev, {
        id: `tip-${Date.now()}-${Math.random()}`,
        emoji: '💰',
        rarity: tipData.amount >= 100 ? 'epic' : tipData.amount >= 50 ? 'rare' : 'common',
        timestamp: Date.now()
      }]);

      // Show top tipper spotlight for large tips (100+ coins)
      if (tipData.amount >= 100) {
        const tipAlert: Alert = {
          type: 'topTipper',
          username: tipData.senderUsername,
          amount: tipData.amount,
          avatarUrl: tipData.senderAvatarUrl,
          id: `tip-spotlight-${Date.now()}-${Math.random()}`,
        };
        setAlerts(prev => [...prev, tipAlert]);
      }
    },
    onViewerCount: (data) => {
      setViewerCount(data.currentViewers);
      setPeakViewers(data.peakViewers);
    },
    onGoalUpdate: () => {
      fetchGoals();
    },
  });

  // Update viewer count from Ably presence
  useEffect(() => {
    if (ablyViewerCount > 0) {
      setViewerCount(ablyViewerCount);
    }
  }, [ablyViewerCount]);

  const fetchStreamDetails = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}`);
      const data = await response.json();

      if (response.ok) {
        setStream(data.stream);
        setViewerCount(data.stream.currentViewers);
        setPeakViewers(data.stream.peakViewers);
        setTotalEarnings(data.stream.totalGiftsReceived);
        // Set stream orientation from database
        setStreamOrientation(data.stream.orientation || 'landscape');
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

        // Use local state values as fallbacks when DB values are 0
        // This handles cases where presence tracking worked but DB wasn't updated
        const dbTotalViews = finalStream.totalViews || 0;
        const dbPeakViewers = finalStream.peakViewers || 0;

        setStreamSummary({
          duration,
          totalViewers: Math.max(dbTotalViews, peakViewers, viewerCount),
          peakViewers: Math.max(dbPeakViewers, peakViewers),
          totalEarnings: finalStream.totalGiftsReceived || totalEarnings,
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
    // Note: Gift feed notifications are handled by GiftAnimationManager (top-right)
    // AlertManager is only used for topTipper spotlight and goal celebrations

    // Check if this is a big gift (500+ coins) for top tipper spotlight
    if (data.streamGift.totalCoins >= 500) {
      const topTipperAlert: Alert = {
        type: 'topTipper',
        username: data.streamGift.senderUsername || 'Anonymous',
        amount: data.streamGift.totalCoins,
        avatarUrl: (data.streamGift as any).senderAvatarUrl || null,
        id: `toptipper-${Date.now()}-${Math.random()}`,
      };
      // Add after a short delay
      setTimeout(() => {
        setAlerts(prev => [...prev, topTipperAlert]);
      }, 2000);
    }

    console.log(`${data.streamGift.senderUsername} sent ${data.gift.emoji} ${data.gift.name}!`);
  };

  // Note: All gift sounds are now centralized in GiftFloatingEmojis component
  // to prevent multiple overlapping sounds when gifts are received

  const removeGiftAnimation = (index: number) => {
    setGiftAnimations((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFloatingGift = (id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
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

  const handlePinMessage = (message: StreamMessage | null) => {
    // If same message is already pinned, unpin it
    if (message && pinnedMessage?.id === message.id) {
      setPinnedMessage(null);
    } else {
      setPinnedMessage(message);
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

  const handleFlipCamera = async () => {
    if (isFlippingCamera) return;
    setIsFlippingCamera(true);

    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacingMode);

      // The LiveKit room will need to restart video with new facing mode
      // This is handled by the room's video capture defaults
      // For now, we'll trigger a re-publish by toggling video

      // Note: Full implementation would require accessing the room instance
      // and calling room.localParticipant.setCameraEnabled(false) then true
      // with new constraints. For MVP, this sets the state for next stream.

      console.log(`Camera switched to ${newFacingMode} mode`);
    } catch (err) {
      console.error('Failed to flip camera:', err);
    } finally {
      setTimeout(() => setIsFlippingCamera(false), 500);
    }
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
    <div className="min-h-[100dvh] md:min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-x-hidden overflow-y-auto">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Mobile Logo Header */}
      <div className="md:hidden relative z-20 flex items-center justify-center py-3 bg-black/50 backdrop-blur-sm border-b border-white/10">
        <img src="/images/digis-logo-white.png" alt="Digis" className="h-7" />
      </div>

      <div className="relative z-10">
      {/* Floating Gift Emojis Overlay */}
      <GiftFloatingEmojis gifts={floatingGifts} onComplete={removeFloatingGift} />

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowEndConfirm(false)} />
          <div className="relative backdrop-blur-xl bg-black/80 rounded-3xl border border-white/20 shadow-2xl p-6 max-w-sm w-full">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isLeaveAttempt ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                  {isLeaveAttempt ? (
                    <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Title and Description */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {isLeaveAttempt ? 'Wait! You\'re Still Live' : 'End Your Stream?'}
                </h3>
                <p className="text-gray-300 text-sm">
                  {isLeaveAttempt
                    ? 'If you leave now, your stream will end and your viewers will be disconnected.'
                    : 'Are you sure you want to end your stream? This will disconnect all viewers.'}
                </p>
              </div>

              <div className="space-y-3">
                {isLeaveAttempt && (
                  <GlassButton
                    variant="gradient"
                    size="lg"
                    onClick={() => setShowEndConfirm(false)}
                    shimmer
                    glow
                    className="w-full text-white font-semibold"
                  >
                    Stay on Stream
                  </GlassButton>
                )}
                <GlassButton
                  variant={isLeaveAttempt ? 'ghost' : 'gradient'}
                  size="lg"
                  onClick={handleEndStream}
                  disabled={isEnding}
                  shimmer={!isLeaveAttempt}
                  glow={!isLeaveAttempt}
                  className={`w-full font-semibold ${isLeaveAttempt ? '!text-red-400 !bg-red-500/10 !border-red-500/50 hover:!bg-red-500/20' : 'text-white bg-gradient-to-r from-red-600 to-pink-600'}`}
                >
                  {isEnding ? 'Ending...' : (isLeaveAttempt ? 'End Stream Anyway' : 'End Stream')}
                </GlassButton>
                {!isLeaveAttempt && (
                  <GlassButton
                    variant="ghost"
                    size="lg"
                    onClick={() => setShowEndConfirm(false)}
                    className="w-full font-semibold !text-white !bg-white/10 !border-white/40 hover:!bg-white/20"
                  >
                    Cancel
                  </GlassButton>
                )}
              </div>
            </div>
          </div>
      )}

      {/* Stream Summary Modal */}
      {showStreamSummary && streamSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" />
          <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-white/20 shadow-2xl p-6 md:p-8 max-w-2xl w-full">
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
                    <Coins className="w-8 h-8 mx-auto text-yellow-400" />
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
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          {supporter.totalCoins}
                        </span>
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
                  Save Stream
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
      )}


      <div className="container mx-auto px-2 sm:px-4 pt-2 md:pt-4 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-6">
        {/* Stream Title - Desktop */}
        <div className="hidden lg:block mb-4">
          <h1 className="text-xl font-bold text-white truncate">{stream?.title || 'Live Stream'}</h1>
        </div>

        <div className={`grid grid-cols-1 ${streamOrientation === 'portrait' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
          {/* Main Video Area */}
          <div className={`${streamOrientation === 'portrait' ? 'lg:col-span-1 max-w-md mx-auto' : 'lg:col-span-2'} space-y-4`}>
            {/* Video Player */}
            <div
              className={`bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative ${
                streamOrientation === 'portrait'
                  ? 'aspect-[9/16] max-h-[80vh] sm:max-h-[70vh]'
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
                        // Use portrait or landscape resolution based on stream setting
                        // On mobile, use lower resolution to prevent camera zoom/crop
                        resolution: streamOrientation === 'portrait'
                          ? { width: isPortraitDevice ? 720 : 1080, height: isPortraitDevice ? 1280 : 1920, frameRate: 30 }
                          : (isSafari ? VideoPresets.h720 : VideoPresets.h1440),
                        facingMode: 'user',
                      },
                      publishDefaults: {
                        videoSimulcastLayers: isSafari
                          ? [
                              VideoPresets.h720,  // 720p max for Safari
                              VideoPresets.h540,  // 540p for medium quality
                              VideoPresets.h360,  // 360p for low bandwidth
                            ]
                          : [
                              VideoPresets.h1440, // 2K (1440p) for premium viewers
                              VideoPresets.h1080, // 1080p for high-quality
                              VideoPresets.h720,  // 720p for medium quality
                              VideoPresets.h360,  // 360p for low bandwidth
                            ],
                        videoEncoding: {
                          // Lower bitrate for Safari
                          maxBitrate: isSafari ? 2_500_000 : 8_000_000,
                          maxFramerate: 30,
                        },
                        dtx: true,
                        red: true,
                      },
                    }}
                  >
                    <LocalCameraPreview isPortrait={streamOrientation === 'portrait'} />
                    <RoomAudioRenderer />
                  </LiveKitRoom>
                  {/* Top Left Overlay - LIVE + Timer */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    {/* LIVE Badge + Timer */}
                    <div className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      <span className="text-red-400 font-bold text-sm">LIVE</span>
                      <span className="text-white font-semibold text-sm">{formatDuration()}</span>
                    </div>

                    {/* Viewers - Compact on mobile */}
                    <div className="hidden sm:block">
                      <ViewerList streamId={streamId} currentViewers={viewerCount} />
                    </div>
                    <div className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-cyan-500/20 rounded-full border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-cyan-400 text-sm font-bold">{viewerCount}</span>
                    </div>

                    {/* Connection Status - Desktop only */}
                    <div className="hidden md:block">
                      <StreamHealthIndicator streamId={streamId} />
                    </div>
                  </div>

                  {/* Top Right Overlay - Coins + Goal + Camera Flip */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    {/* Coins Earned */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-yellow-500/30">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm">{totalEarnings.toLocaleString()}</span>
                    </div>

                    {/* Set Goal Button */}
                    <button
                      onClick={() => {
                        const hasActiveGoal = goals.some(g => g.isActive && !g.isCompleted);
                        if (hasActiveGoal) {
                          alert('You already have an active goal. Please edit or end the existing goal before creating a new one.');
                          return;
                        }
                        setEditingGoal(null);
                        setShowGoalModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-cyan-500/30 text-white font-semibold text-sm hover:border-cyan-500/60 hover:bg-black/80 transition-all"
                    >
                      <Target className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm">GOAL</span>
                    </button>

                    {/* Camera Flip Button - Mobile only */}
                    <button
                      onClick={handleFlipCamera}
                      disabled={isFlippingCamera}
                      className="md:hidden p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-all disabled:opacity-50"
                      title="Flip Camera"
                    >
                      <RefreshCw className={`w-5 h-5 ${isFlippingCamera ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Bottom Center - End Stream Button */}
                  <div className="absolute bottom-14 sm:bottom-3 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={() => {
                        setIsLeaveAttempt(false);
                        setShowEndConfirm(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 backdrop-blur-xl bg-red-500/20 rounded-full border border-red-500/50 text-white font-semibold hover:bg-red-500/30 transition-all"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span className="text-red-400 text-sm font-semibold">End Stream</span>
                    </button>
                  </div>

                  {/* Spotlighted Creator Overlay */}
                  <SpotlightedCreatorOverlay streamId={streamId} isHost={true} />

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
          </div>

          {/* Chat Sidebar + Top Gifters */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className={`${isPortraitDevice ? 'h-[500px]' : 'h-[400px]'} lg:h-[450px] backdrop-blur-xl bg-black/60 rounded-2xl border border-white/10 overflow-hidden`}>
              <StreamChat
                streamId={streamId}
                messages={messages}
                isCreator={true}
                onSendMessage={handleSendMessage}
                onMessageDeleted={fetchMessages}
                pinnedMessage={pinnedMessage}
                onPinMessage={handlePinMessage}
              />
            </div>

            {/* Featured Creators Panel - Desktop only */}
            <div className="hidden lg:block backdrop-blur-xl bg-black/60 rounded-2xl border border-white/10 overflow-hidden">
              <FeaturedCreatorsPanel streamId={streamId} isHost={true} />
            </div>

            {/* Top Gifters Leaderboard - Desktop only */}
            <div className="hidden lg:block backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-3">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Top Gifters
              </h3>
              <div className="space-y-1.5 max-h-[300px] lg:max-h-[180px] overflow-y-auto">
                {leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((supporter, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-bold w-5 flex-shrink-0" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9CA3AF' }}>
                          #{index + 1}
                        </span>
                        <a
                          href={`/${supporter.username}`}
                          className="font-medium text-white truncate hover:text-cyan-400 transition-colors"
                          title={supporter.username}
                        >
                          {supporter.username}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold text-xs">{supporter.totalCoins}</span>
                        {/* Action buttons - show on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => window.open(`/chats?userId=${supporter.senderId}`, '_blank')}
                            className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                            title="Message (opens in new tab)"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            onClick={() => window.open(`/${supporter.username}`, '_blank')}
                            className="p-1 hover:bg-pink-500/20 rounded transition-colors"
                            title="View Profile (opens in new tab)"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-pink-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-3 text-gray-300">
                    <svg className="w-6 h-6 mx-auto text-yellow-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <p className="text-white text-xs font-medium">No gifts yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Creators Panel - Mobile only */}
        <div className="lg:hidden mt-4">
          <FeaturedCreatorsPanel streamId={streamId} isHost={true} />
        </div>

        {/* Top Gifters Leaderboard - Mobile only (below chat) */}
        <div className="lg:hidden mt-4 mb-8 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-3">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Top Gifters
          </h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {leaderboard.length > 0 ? (
              leaderboard.slice(0, 5).map((supporter, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold w-5 flex-shrink-0" style={{ color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#9CA3AF' }}>
                      #{index + 1}
                    </span>
                    <a
                      href={`/${supporter.username}`}
                      className="font-medium text-white truncate hover:text-cyan-400 transition-colors"
                    >
                      {supporter.username}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold text-xs">{supporter.totalCoins}</span>
                    {/* Action buttons - always visible on mobile, open in new tab to avoid leaving stream */}
                    <button
                      onClick={() => window.open(`/chats?userId=${supporter.senderId}`, '_blank')}
                      className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded transition-colors"
                      title="Message (opens in new tab)"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => window.open(`/${supporter.username}`, '_blank')}
                      className="p-1.5 bg-pink-500/20 hover:bg-pink-500/30 rounded transition-colors"
                      title="View Profile (opens in new tab)"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-pink-400" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-300">
                <svg className="w-8 h-8 mx-auto text-yellow-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <p className="text-white text-xs font-medium">No gifts yet</p>
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
