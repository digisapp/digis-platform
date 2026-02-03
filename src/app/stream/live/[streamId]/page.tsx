'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useRoomContext, VideoTrack } from '@livekit/components-react';
import { VideoPresets, Room, Track, LocalParticipant } from 'livekit-client';
import { StreamChat } from '@/components/streaming/StreamChat';
// GiftAnimationManager removed - gifts now show in chat messages
import { GoalProgressBar } from '@/components/streaming/GoalProgressBar';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { SaveStreamModal } from '@/components/streaming/SaveStreamModal';
// VideoControls import removed - not needed for broadcaster view
import { ViewerList } from '@/components/streaming/ViewerList';
import { AlertManager, type Alert } from '@/components/streaming/AlertManager';
import { StreamHealthIndicator } from '@/components/streaming/StreamHealthIndicator';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { FeaturedCreatorsPanel } from '@/components/streaming/FeaturedCreatorsPanel';
import { GuestVideoOverlay } from '@/components/streaming/GuestVideoOverlay';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { AnnounceTicketedStreamModal } from '@/components/streaming/AnnounceTicketedStreamModal';
import { StreamPoll } from '@/components/streaming/StreamPoll';
import { StreamCountdown } from '@/components/streaming/StreamCountdown';
import { CreatePollModal } from '@/components/streaming/CreatePollModal';
import { CreateCountdownModal } from '@/components/streaming/CreateCountdownModal';
import { StreamRecordButton } from '@/components/streaming/StreamRecordButton';
import { StreamClipButton } from '@/components/streaming/StreamClipButton';
import { SaveRecordingsModal } from '@/components/streaming/SaveRecordingsModal';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useStreamRecorder } from '@/hooks/useStreamRecorder';
import { useStreamClipper } from '@/hooks/useStreamClipper';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchWithRetry, isOnline } from '@/lib/utils/fetchWithRetry';
import { createClient } from '@/lib/supabase/client';
import { getAblyClient } from '@/lib/ably/client';
import { Coins, MessageCircle, UserPlus, RefreshCw, Users, Target, Ticket, X, Lock, Play, Square, Calendar, RotateCcw, List, BarChart2, Clock, Smartphone, Monitor, MonitorOff, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Stream, StreamMessage, VirtualGift, StreamGift, StreamGoal } from '@/db/schema';
import { useToastContext } from '@/context/ToastContext';

// Component to show local video preview (camera or screen share)
// isMirrored: true for front camera to match iPhone camera app behavior
function LocalCameraPreview({ isMirrored = true }: { isMirrored?: boolean }) {
  const { localParticipant } = useLocalParticipant();

  // Check for screen share first (takes priority when active)
  const screenShareTrack = localParticipant.getTrackPublication(Track.Source.ScreenShare);
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);

  // Show screen share if active (never mirrored)
  if (screenShareTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: localParticipant, source: Track.Source.ScreenShare, publication: screenShareTrack }}
        className="h-full w-full object-contain"
      />
    );
  }

  // Show camera with optional mirror for front camera
  // Use object-cover to fill portrait containers (like video calls do)
  if (cameraTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: localParticipant, source: Track.Source.Camera, publication: cameraTrack }}
        className="h-full w-full object-cover"
        style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
      />
    );
  }

  // Loading state
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

// Component to control screen sharing (must be inside LiveKitRoom)
function ScreenShareControl({
  isScreenSharing,
  onScreenShareChange
}: {
  isScreenSharing: boolean;
  onScreenShareChange: (sharing: boolean) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [isToggling, setIsToggling] = useState(false);

  const toggleScreenShare = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      const newState = !isScreenSharing;
      await localParticipant.setScreenShareEnabled(newState);
      onScreenShareChange(newState);
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      // User may have cancelled the screen share picker
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={toggleScreenShare}
      disabled={isToggling}
      className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-full border font-semibold text-sm transition-all ${
        isScreenSharing
          ? 'bg-green-500/30 border-green-500/60 text-green-400 hover:bg-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
          : 'bg-black/60 border-white/20 text-white hover:border-green-500/60 hover:bg-black/80'
      } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
      title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
    >
      {isScreenSharing ? (
        <MonitorOff className="w-4 h-4 text-green-400" />
      ) : (
        <Monitor className="w-4 h-4 text-white" />
      )}
      <span className="text-sm hidden sm:inline">{isScreenSharing ? 'Stop Share' : 'Screen'}</span>
    </button>
  );
}

// Component to flip camera between front and back (must be inside LiveKitRoom)
function CameraFlipControl({
  facingMode,
  onFacingModeChange,
  isPortrait
}: {
  facingMode: 'user' | 'environment';
  onFacingModeChange: (mode: 'user' | 'environment') => void;
  isPortrait: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const [isFlipping, setIsFlipping] = useState(false);

  const flipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);

    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

      // Get the camera track
      const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);

      if (cameraTrack?.track) {
        // Stop current camera
        await localParticipant.setCameraEnabled(false);

        // Small delay for camera release
        await new Promise(resolve => setTimeout(resolve, 300));

        // Restart camera with new facing mode
        await localParticipant.setCameraEnabled(true, {
          facingMode: newFacingMode,
          resolution: isPortrait
            ? { width: 1080, height: 1920, frameRate: 30 }
            : { width: 1920, height: 1080, frameRate: 30 }
        });

        onFacingModeChange(newFacingMode);
      }
    } catch (error) {
      console.error('Failed to flip camera:', error);
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <button
      onClick={flipCamera}
      disabled={isFlipping}
      className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-all disabled:opacity-50"
      title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
    >
      <RefreshCw className={`w-5 h-5 ${isFlipping ? 'animate-spin' : ''}`} />
    </button>
  );
}

export default function BroadcastStudioPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showInfo } = useToastContext();
  const streamId = params.streamId as string;

  // Get device IDs from URL params (passed from go-live page for faster startup)
  const preferredVideoDevice = searchParams.get('video') || undefined;
  const preferredAudioDevice = searchParams.get('audio') || undefined;

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
  // giftAnimations state removed - gifts now show in chat messages
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
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announcedTicketedStream, setAnnouncedTicketedStream] = useState<{
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  } | null>(null);
  const [ticketedCountdown, setTicketedCountdown] = useState<string>('');
  const [startingVipStream, setStartingVipStream] = useState(false);
  const [vipModeActive, setVipModeActive] = useState(false);
  const [showVipEndChoice, setShowVipEndChoice] = useState(false);
  const [vipTicketCount, setVipTicketCount] = useState(0);
  const [streamSummary, setStreamSummary] = useState<{
    duration: string;
    totalViewers: number;
    peakViewers: number;
    totalEarnings: number;
    topSupporters: Array<{ username: string; totalCoins: number }>;
    // Ticket stats (if ticketed show was active)
    ticketStats?: {
      ticketsSold: number;
      ticketRevenue: number;
      ticketBuyers: Array<{ username: string; displayName: string | null; avatarUrl: string | null }>;
    };
    // Tip menu stats
    tipMenuStats?: {
      totalTipMenuCoins: number;
      totalPurchases: number;
      items: Array<{
        id: string;
        label: string;
        totalCoins: number;
        purchaseCount: number;
        purchasers: Array<{ username: string; amount: number }>;
      }>;
    };
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [pinnedMessage, setPinnedMessage] = useState<StreamMessage | null>(null);
  const [privateTips, setPrivateTips] = useState<Array<{
    id: string;
    senderId: string;
    senderUsername: string;
    amount: number;
    note: string;
    timestamp: number;
  }>>([]);
  const [showPrivateTips, setShowPrivateTips] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [hasNewPrivateTips, setHasNewPrivateTips] = useState(false);
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [menuItems, setMenuItems] = useState<Array<{ id: string; label: string; emoji: string | null; price: number }>>([]);
  const [showMobileTools, setShowMobileTools] = useState(true); // Expanded by default for host
  const [completedGoal, setCompletedGoal] = useState<{ title: string; rewardText: string } | null>(null);

  // Poll and Countdown state
  const [activePoll, setActivePoll] = useState<{
    id: string;
    question: string;
    options: string[];
    voteCounts: number[];
    totalVotes: number;
    endsAt: string;
    isActive: boolean;
  } | null>(null);
  const [activeCountdown, setActiveCountdown] = useState<{
    id: string;
    label: string;
    endsAt: string;
    isActive: boolean;
  } | null>(null);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

  // Guest call-in state
  const [activeGuest, setActiveGuest] = useState<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    requestType: 'video' | 'voice';
  } | null>(null);
  const [showCreateCountdownModal, setShowCreateCountdownModal] = useState(false);
  const [showSaveRecordingsModal, setShowSaveRecordingsModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Stream recording hook
  const {
    isRecording,
    recordings,
    currentDuration,
    formattedDuration,
    maxDuration,
    maxRecordings,
    remainingRecordings,
    startRecording,
    stopRecording,
    formatDuration: formatRecordingDuration,
  } = useStreamRecorder({
    maxDuration: 1800, // 30 minutes
    maxRecordings: 20,
    onRecordingComplete: (recording) => {
      const mins = Math.floor(recording.duration / 60);
      const secs = recording.duration % 60;
      showSuccess(`Recording saved! ${mins}:${secs.toString().padStart(2, '0')}`);
    },
    onError: (error) => {
      showError(error);
    },
  });

  // Memoize watermark config for clip branding (Digis logo + creator URL)
  const clipWatermark = useMemo(() =>
    currentUsername ? { logoUrl: '/images/digis-logo-white.png', creatorUsername: currentUsername } : undefined,
    [currentUsername]
  );

  // Stream clipping hook (rolling 30-second buffer)
  const {
    isBuffering: isClipBuffering,
    bufferSeconds: clipBufferSeconds,
    isClipping: clipIsClipping,
    setIsClipping: setClipIsClipping,
    canClip,
    isSupported: clipIsSupported,
    clipCooldownRemaining,
    clipIt,
  } = useStreamClipper({
    bufferDurationSeconds: 30,
    watermark: clipWatermark,
    onError: (error) => showError(error),
  });

  const handleCreateClip = async () => {
    const blob = await clipIt();
    if (!blob) return;

    setClipIsClipping(true);
    try {
      const formData = new FormData();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('video', blob, `clip-${Date.now()}.${ext}`);
      formData.append('title', `Live Clip - ${stream?.title || 'Stream'}`);
      formData.append('streamId', streamId);
      formData.append('duration', String(Math.min(clipBufferSeconds, 30)));

      const response = await fetch('/api/clips/live', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create clip');
      }

      // Trigger instant download of the clip from the in-memory blob
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = (stream?.title || 'clip').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      a.download = `${safeName}-clip.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showSuccess('Clipped & saved!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create clip');
    } finally {
      setClipIsClipping(false);
    }
  };

  // Detect Safari browser
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isSafariBrowser = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
    setIsSafari(isSafariBrowser);
  }, []);

  // Get current user ID and username for private tips subscription and branding
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Fetch username for branding watermark
        try {
          const profileRes = await fetch('/api/user/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setCurrentUsername(profileData.user?.username || null);
          }
        } catch (err) {
          console.error('Error fetching username:', err);
        }
      }
    };
    fetchUser();
  }, []);

  // Subscribe to private tip notifications via Ably
  useEffect(() => {
    if (!currentUserId) return;

    let mounted = true;
    let notificationsChannel: any = null;

    const subscribeToPrivateTips = async () => {
      try {
        const ably = getAblyClient();

        // Wait for connection
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            ably.connection.once('failed', () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            });
          });
        }

        if (!mounted) return;

        // Subscribe to user notifications channel for private tips
        notificationsChannel = ably.channels.get(`user:${currentUserId}:notifications`);
        notificationsChannel.subscribe('private_tip', (message: any) => {
          const tipData = message.data;
          if (mounted && tipData.note) {
            setPrivateTips((prev) => [
              {
                id: `tip-${Date.now()}-${Math.random()}`,
                senderId: tipData.senderId,
                senderUsername: tipData.senderUsername,
                amount: tipData.amount,
                note: tipData.note,
                timestamp: tipData.timestamp || Date.now(),
              },
              ...prev,
            ].slice(0, 50)); // Keep last 50 tips

            // Play notification sound - tiered based on amount (1 coin = $0.10)
            // Common: $0.10-$0.99 (1-9 coins)
            // Nice: $1.00-$4.99 (10-49 coins)
            // Super: $5-$19.99 (50-199 coins)
            // Rare: $20-$49.99 (200-499 coins)
            // Epic: $50-$99.99 (500-999 coins)
            // Legendary: $100+ (1000+ coins)
            let soundFile = '/sounds/coin-common.mp3';
            if (tipData.amount >= 1000) {
              soundFile = '/sounds/coin-legendary.mp3';
            } else if (tipData.amount >= 500) {
              soundFile = '/sounds/coin-epic.mp3';
            } else if (tipData.amount >= 200) {
              soundFile = '/sounds/coin-rare.mp3';
            } else if (tipData.amount >= 50) {
              soundFile = '/sounds/coin-super.mp3';
            } else if (tipData.amount >= 10) {
              soundFile = '/sounds/coin-nice.mp3';
            }
            const audio = new Audio(soundFile);
            audio.volume = 0.6;
            audio.play().catch(() => {});

            // Set flag for new tips if panel is closed
            if (!showPrivateTips) {
              setHasNewPrivateTips(true);
            }
          }
        });
      } catch (err) {
        console.error('[PrivateTips] Error subscribing:', err);
      }
    };

    subscribeToPrivateTips();

    return () => {
      mounted = false;
      if (notificationsChannel && notificationsChannel.state === 'attached') {
        notificationsChannel.unsubscribe();
        notificationsChannel.detach().catch(() => {});
      }
    };
  }, [currentUserId, showPrivateTips]);

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

  // Safety timeout: if still 'connecting' after 30 seconds, show disconnected
  useEffect(() => {
    if (connectionStatus !== 'connecting') return;
    const timeout = setTimeout(() => {
      setConnectionStatus(prev => {
        if (prev === 'connecting') {
          console.warn('[LiveKit] Initial connection timed out after 30s');
          return 'disconnected';
        }
        return prev;
      });
    }, 30000);
    return () => clearTimeout(timeout);
  }, [connectionStatus]);

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
    fetchPoll();
    fetchCountdown();
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
  // isHost: true prevents the host from being counted as a viewer
  const { viewerCount: ablyViewerCount } = useStreamChat({
    streamId,
    isHost: true,
    onMessage: (message) => {
      // Transform the received message to match StreamMessage type
      // The Ably message may have 'content' or 'message' field depending on source
      const msgData = message as any;
      const streamMessage = {
        id: msgData.id,
        streamId: msgData.streamId || streamId,
        userId: msgData.userId,
        username: msgData.username,
        message: msgData.message || msgData.content || '', // Handle both field names
        messageType: msgData.messageType || 'chat',
        giftId: msgData.giftId || null,
        giftAmount: msgData.giftAmount || null,
        giftName: msgData.giftName || null,
        giftEmoji: msgData.giftEmoji || null,
        giftQuantity: msgData.giftQuantity || null,
        tipMenuItemId: msgData.tipMenuItemId || null,
        tipMenuItemLabel: msgData.tipMenuItemLabel || null,
        createdAt: msgData.createdAt ? new Date(msgData.createdAt) : new Date(),
        user: msgData.user, // Pass through user data for avatar display
      } as unknown as StreamMessage;

      // Play sound for ticket purchases (so creator hears when someone buys a ticket)
      if (msgData.messageType === 'ticket_purchase') {
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }

      setMessages((prev) => {
        // Check if message already exists (from optimistic add or duplicate broadcast)
        if (prev.some(m => m.id === streamMessage.id)) {
          return prev;
        }
        return [...prev, streamMessage];
      });
    },
    onGift: (giftEvent) => {
      setTotalEarnings((prev) => prev + (giftEvent.streamGift.quantity || 1) * (giftEvent.gift.coinCost || 0));
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
      // Add gift message to chat so host can see it
      const giftMessage = {
        id: `gift-${Date.now()}`,
        streamId,
        userId: giftEvent.streamGift.senderId,
        username: giftEvent.streamGift.senderUsername,
        message: `sent ${giftEvent.streamGift.quantity > 1 ? giftEvent.streamGift.quantity + 'x ' : ''}${giftEvent.gift.emoji} ${giftEvent.gift.name}`,
        messageType: 'gift' as const,
        giftId: giftEvent.gift.id,
        giftAmount: giftEvent.streamGift.quantity * giftEvent.gift.coinCost,
        giftEmoji: giftEvent.gift.emoji,
        giftName: giftEvent.gift.name,
        giftQuantity: giftEvent.streamGift.quantity,
        tipMenuItemId: null,
        tipMenuItemLabel: null,
        user: { avatarUrl: giftEvent.streamGift.senderAvatarUrl || null },
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, giftMessage as unknown as StreamMessage]);
      // Update goals progress and leaderboard
      fetchGoals();
      fetchLeaderboard();
    },
    onTip: (tipData) => {
      setTotalEarnings((prev) => prev + tipData.amount);
      fetchLeaderboard();

      // Generate message content based on item type
      let content = `tipped ${tipData.amount} coins!`;
      let messageType: 'tip' | 'menu_purchase' | 'menu_order' | 'menu_tip' | 'super_tip' = 'tip';
      let emoji = '💰';

      if (tipData.menuItemLabel) {
        if (tipData.itemCategory === 'product' || tipData.fulfillmentType === 'digital') {
          content = `📥 purchased "${tipData.menuItemLabel}" for ${tipData.amount} coins`;
          messageType = 'menu_purchase';
          emoji = '📦';
        } else if (tipData.fulfillmentType === 'manual' || tipData.itemCategory === 'service') {
          content = `💌 ordered "${tipData.menuItemLabel}" for ${tipData.amount} coins`;
          messageType = 'menu_order';
          emoji = '📝';
        } else {
          content = `⭐ sent ${tipData.amount} coins for "${tipData.menuItemLabel}"`;
          messageType = 'menu_tip';
          emoji = '⭐';
        }
      }

      // If tip includes a custom message, use super_tip type for highlighted display
      if (tipData.message) {
        messageType = 'super_tip';
        emoji = '💬';
      }

      // Add tip message to chat so host can see it
      // Map Ably event fields to StreamMessage fields expected by StreamChat component
      const tipMessage = {
        id: `tip-${Date.now()}-${Math.random()}`,
        streamId,
        userId: tipData.senderId,
        username: tipData.senderUsername,
        message: content,
        messageType: messageType as any,
        giftAmount: tipData.amount,
        tipMessage: tipData.message || null, // Custom message from viewer
        createdAt: new Date(),
        // Include user object for avatar display
        user: {
          avatarUrl: tipData.senderAvatarUrl || null,
        },
      } as unknown as StreamMessage;
      setMessages((prev) => [...prev, tipMessage]);

      // Add floating emoji for visual feedback
      setFloatingGifts(prev => [...prev, {
        id: `tip-${Date.now()}-${Math.random()}`,
        emoji,
        rarity: tipData.amount >= 100 ? 'epic' : tipData.amount >= 50 ? 'rare' : 'common',
        timestamp: Date.now()
      }]);
    },
    onViewerCount: (data) => {
      setViewerCount(data.currentViewers);
      setPeakViewers(data.peakViewers);
    },
    onViewerJoined: () => {
      // Play new viewer sound (with built-in cooldown via audio element)
      const audio = new Audio('/sounds/new-viewer.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    },
    onGoalUpdate: (update) => {
      fetchGoals();
      // Show celebration notification if goal completed
      if (update.action === 'completed' && update.goal) {
        setCompletedGoal({
          title: update.goal.title || 'Stream Goal',
          rewardText: update.goal.rewardText || 'Goal reached!',
        });
        // Auto-hide after 5 seconds
        setTimeout(() => setCompletedGoal(null), 5000);
      }
    },
    // Poll updates (from remote control)
    onPollUpdate: (event) => {
      if (event.action === 'ended') {
        setActivePoll(null);
      } else {
        fetchPoll();
      }
    },
    // Countdown updates (from remote control)
    onCountdownUpdate: (event) => {
      if (event.action === 'ended' || event.action === 'cancelled') {
        setActiveCountdown(null);
      } else {
        fetchCountdown();
      }
    },
    // VIP show announcements (from remote control)
    onTicketedAnnouncement: (event) => {
      setAnnouncedTicketedStream({
        id: event.ticketedStreamId,
        title: event.title,
        ticketPrice: event.ticketPrice,
        startsAt: new Date(event.startsAt),
      });
    },
    // VIP mode changes
    onVipModeChange: (event) => {
      setVipModeActive(event.isActive);
      if (event.isActive) {
        showSuccess('VIP show started!');
      }
    },
    // Guest call-in events (host perspective)
    onGuestJoined: (event) => {
      // Update active guest when guest joins
      setActiveGuest({
        userId: event.userId,
        username: event.username,
        displayName: event.displayName,
        avatarUrl: null,
        requestType: event.requestType,
      });
      showSuccess(`${event.username} has joined as a guest!`);
    },
    onGuestRemoved: () => {
      // Clear active guest when guest is removed
      setActiveGuest(null);
    },
  });

  // Update viewer count from Ably presence
  useEffect(() => {
    if (ablyViewerCount > 0) {
      setViewerCount(ablyViewerCount);
    }
  }, [ablyViewerCount]);

  // Poll for ticket count when there's an announced ticketed stream
  useEffect(() => {
    if (!announcedTicketedStream || vipModeActive) return;

    const fetchTicketCount = async () => {
      try {
        const res = await fetch(`/api/shows/${announcedTicketedStream.id}`);
        if (res.ok) {
          const data = await res.json();
          setVipTicketCount(data.show?.ticketsSold || 0);
        }
      } catch (e) {
        console.error('[Ticketed] Failed to fetch ticket count:', e);
      }
    };

    // Fetch immediately
    fetchTicketCount();
    // Then poll every 10 seconds
    const interval = setInterval(fetchTicketCount, 10000);

    return () => clearInterval(interval);
  }, [announcedTicketedStream?.id, vipModeActive]);

  // Countdown timer for announced ticketed stream
  useEffect(() => {
    if (!announcedTicketedStream || vipModeActive) {
      setTicketedCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const startsAt = new Date(announcedTicketedStream.startsAt);
      const diff = startsAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTicketedCountdown('Starting soon');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTicketedCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTicketedCountdown(`${minutes}m ${seconds}s`);
      } else {
        setTicketedCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [announcedTicketedStream, vipModeActive]);

  // Poll for active poll vote updates (every 5 seconds)
  useEffect(() => {
    if (!activePoll?.isActive) return;

    const interval = setInterval(fetchPoll, 5000);
    return () => clearInterval(interval);
  }, [activePoll?.isActive, streamId]);

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
        // Set menu enabled state from database (default to true if not set)
        setMenuEnabled(data.stream.tipMenuEnabled ?? true);

        // Restore VIP mode state if active (handles page refresh)
        if (data.stream.vipModeActive && data.stream.activeVipShow) {
          setVipModeActive(true);
          setAnnouncedTicketedStream({
            id: data.stream.activeVipShow.id,
            title: data.stream.activeVipShow.title,
            ticketPrice: data.stream.activeVipShow.ticketPrice,
            startsAt: new Date(data.stream.activeVipShow.startsAt),
          });
        } else if (data.stream.upcomingTicketedShow) {
          // Restore pending/scheduled VIP show (not yet started)
          setAnnouncedTicketedStream({
            id: data.stream.upcomingTicketedShow.id,
            title: data.stream.upcomingTicketedShow.title,
            ticketPrice: data.stream.upcomingTicketedShow.ticketPrice,
            startsAt: new Date(data.stream.upcomingTicketedShow.startsAt),
          });
        }

        // Fetch menu items for the creator (which is the current user)
        if (data.stream.creatorId) {
          fetch(`/api/tip-menu/${data.stream.creatorId}`)
            .then(res => res.json())
            .then(menuData => {
              if (menuData.items && menuData.items.length > 0) {
                setMenuItems(menuData.items);
              }
            })
            .catch(err => console.error('Error fetching menu items:', err));
        }
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

  const fetchBroadcastToken = async (retryCount = 0) => {
    const maxRetries = 3;

    try {
      console.log(`[Broadcast] Fetching token (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      const response = await fetch(`/api/streams/${streamId}/broadcast-token`, {
        credentials: 'same-origin', // Explicitly include cookies (Safari compatibility)
      });
      const data = await response.json();

      if (response.ok) {
        console.log('[Broadcast] Token received successfully');
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } else if (response.status === 401 && retryCount < maxRetries) {
        // Auth may not be ready yet (common on Safari) - retry with backoff
        console.warn(`[Broadcast] Auth not ready (401), retrying in ${(retryCount + 1)}s...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return fetchBroadcastToken(retryCount + 1);
      } else {
        console.error(`[Broadcast] Token fetch failed: ${data.error} (status ${response.status})`);
        setError(data.error || 'Not authorized to broadcast');
      }
    } catch (err) {
      if (retryCount < maxRetries) {
        // Network error - retry with backoff
        console.warn(`[Broadcast] Token fetch error, retrying in ${(retryCount + 1)}s...`, err);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return fetchBroadcastToken(retryCount + 1);
      }
      console.error('[Broadcast] Token fetch failed after all retries:', err);
      setError('Failed to get broadcast token. Please check your connection and try again.');
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

            // Play celebration sound
            const audio = new Audio('/sounds/goal-complete.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});

            // Add goal completion message to chat instead of popup
            const goalCompleteMessage = {
              id: `goal-complete-${goal.id}-${Date.now()}`,
              streamId,
              userId: 'system',
              username: '🎯 Goal Complete!',
              message: `🎉 ${goal.description || 'Stream Goal'} reached! (${goal.targetAmount}/${goal.targetAmount} coins) 🎉`,
              messageType: 'system' as const,
              giftId: null,
              giftAmount: null,
              createdAt: new Date(),
            };
            setMessages((prev) => [...prev, goalCompleteMessage as StreamMessage]);
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

  const fetchPoll = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/polls`);
      const data = await response.json();
      if (response.ok) {
        setActivePoll(data.poll);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching poll:', err);
      }
    }
  };

  const fetchCountdown = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/countdown`);
      const data = await response.json();
      if (response.ok) {
        setActiveCountdown(data.countdown);
      }
    } catch (err) {
      if (isOnline()) {
        console.error('Error fetching countdown:', err);
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
    // Check if there's a pending VIP show that hasn't started yet
    if (announcedTicketedStream && !vipModeActive && !showVipEndChoice) {
      // Fetch ticket count for the VIP show
      try {
        const res = await fetch(`/api/shows/${announcedTicketedStream.id}`);
        if (res.ok) {
          const data = await res.json();
          setVipTicketCount(data.show?.ticketsSold || 0);
        }
      } catch (e) {
        console.error('Failed to fetch VIP show info:', e);
      }
      // Show VIP choice dialog instead of ending immediately
      setShowEndConfirm(false);
      setShowVipEndChoice(true);
      return;
    }

    setIsEnding(true);
    setHasManuallyEnded(true); // Prevent auto-end from triggering

    // Disconnect from LiveKit immediately by clearing token
    setToken('');

    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        // Fetch stream summary data
        await fetchStreamSummary();
        setShowEndConfirm(false);
        setShowVipEndChoice(false);

        // If there are recordings, show the save modal first
        if (recordings.length > 0) {
          setShowSaveRecordingsModal(true);
        } else {
          setShowStreamSummary(true);
        }
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to end stream');
        setHasManuallyEnded(false); // Reset if failed
        setShowEndConfirm(false);
        setShowVipEndChoice(false);
      }
    } catch (err) {
      showError('Failed to end stream');
      setHasManuallyEnded(false); // Reset if failed
      setShowEndConfirm(false);
      setShowVipEndChoice(false);
    } finally {
      setIsEnding(false);
    }
  };

  // End stream and keep VIP show scheduled
  const handleEndStreamKeepVip = async () => {
    setShowVipEndChoice(false);
    setIsEnding(true);
    setHasManuallyEnded(true);

    // Disconnect from LiveKit immediately by clearing token
    setToken('');

    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchStreamSummary();
        setShowStreamSummary(true);
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to end stream');
        setHasManuallyEnded(false);
      }
    } catch (err) {
      showError('Failed to end stream');
      setHasManuallyEnded(false);
    } finally {
      setIsEnding(false);
    }
  };

  // End stream and cancel VIP show with refunds
  const handleEndStreamCancelVip = async () => {
    if (!announcedTicketedStream) return;

    setShowVipEndChoice(false);
    setIsEnding(true);
    setHasManuallyEnded(true);

    // Disconnect from LiveKit immediately by clearing token
    setToken('');

    try {
      // First cancel the VIP show (this will refund tickets)
      const cancelRes = await fetch(`/api/shows/${announcedTicketedStream.id}/cancel`, {
        method: 'POST',
      });

      if (!cancelRes.ok) {
        const data = await cancelRes.json();
        showError(data.error || 'Failed to cancel VIP show');
        setHasManuallyEnded(false);
        setIsEnding(false);
        return;
      }

      // Then end the stream
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchStreamSummary();
        setAnnouncedTicketedStream(null);
        setShowStreamSummary(true);
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to end stream');
        setHasManuallyEnded(false);
      }
    } catch (err) {
      showError('Failed to end stream');
      setHasManuallyEnded(false);
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

      // Fetch menu stats
      let tipMenuStats: {
        totalTipMenuCoins: number;
        totalPurchases: number;
        items: Array<{
          id: string;
          label: string;
          totalCoins: number;
          purchaseCount: number;
          purchasers: Array<{ username: string; amount: number }>;
        }>;
      } | undefined;

      try {
        const tipMenuResponse = await fetch(`/api/streams/${streamId}/tip-menu-stats`);
        if (tipMenuResponse.ok) {
          const tipMenuData = await tipMenuResponse.json();
          if (tipMenuData.totalPurchases > 0) {
            tipMenuStats = tipMenuData;
          }
        }
      } catch (tipMenuErr) {
        console.error('Failed to fetch menu stats:', tipMenuErr);
      }

      // Fetch ticket stats if there was a ticketed show
      let ticketStats: {
        ticketsSold: number;
        ticketRevenue: number;
        ticketBuyers: Array<{ username: string; displayName: string | null; avatarUrl: string | null }>;
      } | undefined;

      if (announcedTicketedStream) {
        try {
          const [statsRes, attendeesRes] = await Promise.all([
            fetch(`/api/shows/${announcedTicketedStream.id}/stats`),
            fetch(`/api/shows/${announcedTicketedStream.id}/attendees`),
          ]);

          if (statsRes.ok && attendeesRes.ok) {
            const statsData = await statsRes.json();
            const attendeesData = await attendeesRes.json();

            ticketStats = {
              ticketsSold: statsData.stats?.ticketsSold || vipTicketCount,
              ticketRevenue: statsData.stats?.totalRevenue || 0,
              ticketBuyers: attendeesData.attendees?.map((a: any) => ({
                username: a.user?.username || 'Unknown',
                displayName: a.user?.displayName || null,
                avatarUrl: a.user?.avatarUrl || null,
              })) || [],
            };
          }
        } catch (ticketErr) {
          console.error('Failed to fetch ticket stats:', ticketErr);
        }
      }

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
          ticketStats,
          tipMenuStats,
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

  // Note: All gift sounds are now centralized in GiftFloatingEmojis component
  // to prevent multiple overlapping sounds when gifts are received
  // Gift popup removed - gifts now show in chat messages

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

      // Optimistically add the message to local state so host sees it immediately
      // The message will also come back via Ably, so we use the returned message ID to avoid duplicates
      if (data.message) {
        setMessages((prev) => {
          // Check if message already exists (from Ably broadcast)
          if (prev.some(m => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message as StreamMessage];
        });
      }
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

  // Toggle menu visibility for viewers
  const handleToggleMenu = async () => {
    const newEnabled = !menuEnabled;
    console.log('[Menu] Creator toggling menu to:', newEnabled);
    setMenuEnabled(newEnabled); // Optimistic update

    try {
      const response = await fetch(`/api/streams/${streamId}/tip-menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });

      if (!response.ok) {
        // Revert on error
        setMenuEnabled(!newEnabled);
        console.error('[Menu] Failed to toggle menu');
      } else {
        const data = await response.json();
        console.log('[Menu] Toggle API response:', data);
      }
    } catch (err) {
      // Revert on error
      setMenuEnabled(!newEnabled);
      console.error('[Menu] Error toggling menu:', err);
    }
  };

  // Start the VIP ticketed stream immediately (activates VIP mode on current stream)
  const handleStartVipStream = async () => {
    if (!announcedTicketedStream || startingVipStream) return;
    setStartingVipStream(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: announcedTicketedStream.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start VIP stream');
      }

      // VIP mode is now active - update UI
      setVipModeActive(true);
      setStartingVipStream(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start VIP stream');
      setStartingVipStream(false);
    }
  };

  // End VIP mode and return to free stream
  const handleEndVipStream = async () => {
    if (!vipModeActive) return;

    try {
      const response = await fetch(`/api/streams/${streamId}/vip`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end VIP stream');
      }

      // VIP mode ended - return to free stream
      setVipModeActive(false);
      setAnnouncedTicketedStream(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to end VIP stream');
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

      {/* Goal Completed Celebration */}
      {completedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{completedGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{completedGoal.rewardText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Note: GiftAnimationManager removed - gifts now show in chat messages */}

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

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        streamId={streamId}
        onPollCreated={fetchPoll}
      />

      {/* Create Countdown Modal */}
      <CreateCountdownModal
        isOpen={showCreateCountdownModal}
        onClose={() => setShowCreateCountdownModal(false)}
        streamId={streamId}
        onCountdownCreated={fetchCountdown}
      />

      {/* End Stream Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)} />
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

      {/* VIP Show Choice Modal - When ending stream with pending VIP show */}
      {showVipEndChoice && announcedTicketedStream && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowVipEndChoice(false)} />
          <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-white/20 shadow-2xl p-6 max-w-md w-full">
            {/* Close button */}
            <button
              onClick={() => setShowVipEndChoice(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Ticket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                You Have a Pending VIP Show
              </h3>
              <p className="text-gray-300 text-sm">
                "{announcedTicketedStream.title}" is scheduled but hasn't started yet.
                {vipTicketCount > 0 && (
                  <span className="block mt-2 text-amber-400 font-medium">
                    {vipTicketCount} {vipTicketCount === 1 ? 'person has' : 'people have'} already purchased tickets!
                  </span>
                )}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Keep Scheduled Option */}
              <button
                onClick={handleEndStreamKeepVip}
                disabled={isEnding}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-600/30 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">Keep Scheduled</h4>
                    <p className="text-xs text-gray-400">
                      End your stream but keep the VIP show scheduled. You can start it in a future stream.
                    </p>
                  </div>
                </div>
              </button>

              {/* Cancel & Refund Option */}
              <button
                onClick={handleEndStreamCancelVip}
                disabled={isEnding}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/50 hover:border-red-400 hover:bg-red-600/30 transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                    <RotateCcw className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">Cancel & Refund</h4>
                    <p className="text-xs text-gray-400">
                      Cancel the VIP show and automatically refund all ticket purchases.
                      {vipTicketCount > 0 && ` (${vipTicketCount} refund${vipTicketCount === 1 ? '' : 's'})`}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Loading State */}
            {isEnding && (
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Processing...</span>
              </div>
            )}

            {/* Cancel Button */}
            <div className="mt-4">
              <GlassButton
                variant="ghost"
                size="md"
                onClick={() => setShowVipEndChoice(false)}
                disabled={isEnding}
                className="w-full !text-gray-400 !border-gray-600 hover:!text-white"
              >
                Go Back to Stream
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Stream Summary Modal */}
      {showStreamSummary && streamSummary && (
        <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => router.push('/creator/dashboard')} />
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-white/20 shadow-2xl p-6 md:p-8 max-w-2xl w-full">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Stream Complete!</h2>
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
                  <div className="text-2xl font-bold text-yellow-400">
                    {(streamSummary.totalEarnings || 0) + (streamSummary.ticketStats?.ticketRevenue || 0)}
                  </div>
                  <div className="text-sm text-gray-200 font-medium">Total Coins Earned</div>
                </div>
              </div>

              {/* Ticket Sales Stats */}
              {streamSummary.ticketStats && streamSummary.ticketStats.ticketsSold > 0 && (
                <div className="mb-6 backdrop-blur-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl border border-amber-500/30 p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-amber-400" />
                    Ticket Sales
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-amber-400">{streamSummary.ticketStats.ticketsSold}</div>
                      <div className="text-xs text-gray-300">Tickets Sold</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
                        <Coins className="w-5 h-5" />
                        {streamSummary.ticketStats.ticketRevenue}
                      </div>
                      <div className="text-xs text-gray-300">Ticket Revenue</div>
                    </div>
                  </div>
                  {streamSummary.ticketStats.ticketBuyers.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-300 mb-2">Ticket Buyers:</div>
                      <div className="flex flex-wrap gap-2">
                        {streamSummary.ticketStats.ticketBuyers.map((buyer, index) => (
                          <div key={index} className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-full">
                            {buyer.avatarUrl ? (
                              <img src={buyer.avatarUrl} alt={buyer.username} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-black">
                                {buyer.username?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs font-medium text-white">@{buyer.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Earnings Breakdown (if there were both tips and tickets) */}
              {streamSummary.ticketStats && streamSummary.ticketStats.ticketRevenue > 0 && streamSummary.totalEarnings > 0 && (
                <div className="mb-6 text-sm text-gray-400 text-center">
                  <span className="text-yellow-400">{streamSummary.totalEarnings}</span> from tips/gifts + <span className="text-amber-400">{streamSummary.ticketStats.ticketRevenue}</span> from tickets
                </div>
              )}

              {/* Menu Stats */}
              {streamSummary.tipMenuStats && streamSummary.tipMenuStats.totalPurchases > 0 && (
                <div className="mb-6 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Menu Stats
                  </h3>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-pink-400 flex items-center justify-center gap-2">
                      <Coins className="w-7 h-7 text-yellow-400" />
                      {streamSummary.tipMenuStats.totalTipMenuCoins.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                      from {streamSummary.tipMenuStats.totalPurchases} menu purchase{streamSummary.tipMenuStats.totalPurchases !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {streamSummary.tipMenuStats.items.map((item) => (
                      <div key={item.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-white">{item.label}</span>
                          <span className="text-pink-400 font-bold flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-400" />
                            {item.totalCoins.toLocaleString()}
                            <span className="text-gray-400 text-xs ml-1">({item.purchaseCount}x)</span>
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.purchasers.map((purchaser, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-full"
                            >
                              @{purchaser.username}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  onClick={() => router.push('/creator/dashboard')}
                  shimmer
                  glow
                  className="w-full !text-white font-semibold"
                >
                  Back to Dashboard
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className={`container mx-auto px-2 sm:px-4 pt-2 md:pt-4 md:pb-6 ${isLandscape ? 'pb-2' : 'pb-[calc(80px+env(safe-area-inset-bottom))]'}`}>
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
                  ? isLandscape
                    ? 'h-[calc(100vh-120px)] w-auto mx-auto aspect-[9/16]' // Landscape device viewing portrait stream
                    : 'aspect-[9/16] max-h-[80vh] sm:max-h-[70vh]' // Portrait device viewing portrait stream
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
                        // Capture at 2K (1440p) for maximum quality
                        // Falls back to 1080p if device doesn't support 2K
                        resolution: VideoPresets.h1440,
                        facingMode: 'user',
                        // Use same device from go-live preview for faster startup
                        deviceId: preferredVideoDevice,
                      },
                      audioCaptureDefaults: {
                        // Use same audio device from go-live preview
                        deviceId: preferredAudioDevice,
                      },
                      publishDefaults: {
                        videoSimulcastLayers: [
                          VideoPresets.h1440, // 2K - max quality
                          VideoPresets.h1080, // 1080p
                          VideoPresets.h720,  // 720p fallback
                        ],
                        videoEncoding: {
                          maxBitrate: 10_000_000, // 10 Mbps for 2K quality
                          maxFramerate: 30,
                          priority: 'high',
                        },
                        screenShareEncoding: {
                          maxBitrate: 12_000_000, // 12 Mbps for crisp screen share
                          maxFramerate: 30,
                        },
                        dtx: true,
                        red: true,
                      },
                    }}
                    onConnected={() => {
                      console.log('[LiveKit] Connected to room');
                      setConnectionStatus('connected');
                    }}
                    onDisconnected={() => {
                      console.log('[LiveKit] Disconnected from room');
                      setConnectionStatus(prev => {
                        // Only show reconnecting if we were previously connected
                        if (prev === 'connected') return 'reconnecting';
                        // During initial connection, stay in connecting state (LiveKit will retry)
                        return prev;
                      });
                    }}
                    onError={(error) => {
                      console.error('[LiveKit] Room error:', error);
                      setConnectionStatus(prev => {
                        // During initial connection, don't immediately show "Connection Lost"
                        // LiveKit will retry internally — only mark disconnected if we were already connected
                        if (prev === 'connecting') {
                          console.log('[LiveKit] Error during initial connection, staying in connecting state');
                          return prev;
                        }
                        return 'disconnected';
                      });
                    }}
                  >
                    {/* Reconnection Overlay */}
                    {(connectionStatus === 'reconnecting' || connectionStatus === 'disconnected') && (
                      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                        {connectionStatus === 'reconnecting' ? (
                          <>
                            <div className="w-16 h-16 mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
                              <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
                            </div>
                            <p className="text-white text-lg font-semibold mb-2">Reconnecting...</p>
                            <p className="text-white/60 text-sm">Please wait while we restore your connection</p>
                          </>
                        ) : (
                          <>
                            <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                              <X className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-white text-lg font-semibold mb-2">Connection Lost</p>
                            <p className="text-white/60 text-sm mb-4">Unable to maintain stream connection</p>
                            <button
                              onClick={() => {
                                setConnectionStatus('connecting');
                                // Force re-fetch token and reconnect
                                window.location.reload();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reconnect
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <LocalCameraPreview isMirrored={facingMode === 'user'} />
                    <RoomAudioRenderer />
                    {/* Screen Share Control - Desktop only, positioned in bottom right of video */}
                    <div className="absolute bottom-3 right-3 z-20 hidden md:block">
                      <ScreenShareControl
                        isScreenSharing={isScreenSharing}
                        onScreenShareChange={setIsScreenSharing}
                      />
                    </div>
                    {/* Camera Flip Control - Mobile only, positioned in top right */}
                    <div className="absolute top-3 right-3 z-30 md:hidden">
                      <CameraFlipControl
                        facingMode={facingMode}
                        onFacingModeChange={setFacingMode}
                        isPortrait={streamOrientation === 'portrait'}
                      />
                    </div>
                  </LiveKitRoom>
                  {/* Top Left Overlay - Live Indicator + Timer */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    {/* Red Dot + Timer */}
                    <div className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      <span className="text-white font-semibold text-sm">{formatDuration()}</span>
                    </div>

                    {/* Viewers - Click to see list on all screens */}
                    <ViewerList streamId={streamId} currentViewers={viewerCount} activeGuestId={activeGuest?.userId} />

                    {/* Coins Earned - Show on mobile too, next to viewers */}
                    <div className="flex items-center gap-1.5 px-3 py-2 backdrop-blur-xl bg-black/60 rounded-full border border-yellow-500/30">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm">{totalEarnings.toLocaleString()}</span>
                    </div>

                    {/* Connection Status - visible on all screens */}
                    <StreamHealthIndicator streamId={streamId} />

                    {/* Screen Share Active Indicator */}
                    {isScreenSharing && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-green-500/20 rounded-full border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                        <Monitor className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-bold">Sharing Screen</span>
                      </div>
                    )}
                  </div>

                  {/* Mobile Second Row - Record, Clip, End Stream */}
                  <div className="absolute top-14 left-3 right-3 z-20 md:hidden">
                    <div className="flex items-center justify-between">
                      {/* Left side: Record + Clip */}
                      <div className="flex items-center gap-2">
                        <StreamRecordButton
                          isRecording={isRecording}
                          currentDuration={formattedDuration}
                          maxDuration={maxDuration}
                          recordingsCount={recordings.length}
                          maxRecordings={maxRecordings}
                          onStartRecording={startRecording}
                          onStopRecording={stopRecording}
                        />
                        {clipIsSupported && (
                          <StreamClipButton
                            canClip={canClip}
                            isClipping={clipIsClipping}
                            bufferSeconds={clipBufferSeconds}
                            cooldownRemaining={clipCooldownRemaining}
                            onClip={handleCreateClip}
                            compact
                          />
                        )}
                      </div>

                      {/* Right side: End Stream - Larger */}
                      <button
                        onClick={() => {
                          if (isRecording) {
                            stopRecording();
                          }
                          setIsLeaveAttempt(false);
                          setShowEndConfirm(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2.5 backdrop-blur-xl bg-red-500/20 rounded-full border border-red-500/50 text-white font-semibold hover:bg-red-500/30 transition-all"
                      >
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span className="text-red-400 text-sm font-semibold">End</span>
                      </button>
                    </div>
                  </div>

                  {/* Top Right Overlay - Desktop: All buttons, Mobile: Just coins + camera flip */}
                  <div className="absolute top-3 right-3 z-10">
                    {/* Desktop Layout - Single Row */}
                    <div className="hidden md:flex items-center gap-2">
                      {/* Main action buttons first (left side) */}
                      {/* Set Goal Button */}
                      {(() => {
                        const hasActiveGoal = goals.some(g => g.isActive && !g.isCompleted);
                        return (
                          <button
                            onClick={() => {
                              if (hasActiveGoal) return;
                              setEditingGoal(null);
                              setShowGoalModal(true);
                            }}
                            disabled={hasActiveGoal}
                            className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-full border font-semibold text-sm transition-all ${
                              hasActiveGoal
                                ? 'bg-black/40 border-gray-600/30 text-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-black/60 border-cyan-500/30 text-white hover:border-cyan-500/60 hover:bg-black/80'
                            }`}
                          >
                            <Target className={`w-4 h-4 ${hasActiveGoal ? 'text-gray-500' : 'text-cyan-400'}`} />
                            <span className="text-sm">GOAL</span>
                          </button>
                        );
                      })()}

                      {/* Poll Button */}
                      <button
                        onClick={() => setShowCreatePollModal(true)}
                        disabled={!!activePoll?.isActive}
                        className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-full border font-semibold text-sm transition-all ${
                          activePoll?.isActive
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 cursor-not-allowed'
                            : 'bg-black/60 border-purple-500/30 text-white hover:border-purple-500/60 hover:bg-black/80'
                        }`}
                      >
                        <BarChart2 className="w-4 h-4 text-purple-400" />
                        <span className="text-sm">Poll</span>
                      </button>

                      {/* Countdown Button */}
                      <button
                        onClick={() => setShowCreateCountdownModal(true)}
                        disabled={!!activeCountdown?.isActive}
                        className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-full border font-semibold text-sm transition-all ${
                          activeCountdown?.isActive
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 cursor-not-allowed'
                            : 'bg-black/60 border-cyan-500/30 text-white hover:border-cyan-500/60 hover:bg-black/80'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm">Timer</span>
                      </button>

                      {/* Announce Ticketed Stream Button */}
                      {!announcedTicketedStream && (
                        <button
                          onClick={() => setShowAnnounceModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-amber-500/30 text-white font-semibold text-sm hover:border-amber-500/60 hover:bg-black/80 transition-all"
                        >
                          <Ticket className="w-4 h-4 text-amber-400" />
                          <span className="text-sm">VIP</span>
                        </button>
                      )}

                      {/* Divider */}
                      <div className="w-px h-6 bg-white/20" />

                      {/* Less used buttons (right side): Menu, Phone - Icon only */}
                      {/* Menu Toggle Button - Icon only */}
                      <button
                        onClick={handleToggleMenu}
                        className={`p-2 backdrop-blur-xl rounded-full border transition-all ${
                          menuEnabled
                            ? 'bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30'
                            : 'bg-black/60 border-white/20 hover:border-white/40 hover:bg-black/80'
                        }`}
                        title={menuEnabled ? 'Hide Creator Menu' : 'Show Creator Menu'}
                      >
                        <List className={`w-4 h-4 ${menuEnabled ? 'text-yellow-400' : 'text-white/60'}`} />
                      </button>

                      {/* Phone Button - Icon only */}
                      <button
                        onClick={() => setShowQRCode(true)}
                        className="p-2 backdrop-blur-xl bg-black/60 rounded-full border border-green-500/30 text-white hover:border-green-500/60 hover:bg-black/80 transition-all"
                        title="Remote Control"
                      >
                        <Smartphone className="w-4 h-4 text-green-400" />
                      </button>
                    </div>

                    {/* Mobile Layout - empty, coins moved to top-left with viewers */}
                  </div>

                  {/* Mobile Bottom Tools - Collapsible + button */}
                  <div className="absolute bottom-3 left-3 z-50 md:hidden">
                    {showMobileTools ? (
                      /* Expanded tools menu */
                      <div className="flex flex-col gap-3 p-4 backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-xl">
                        {/* Close button */}
                        <button
                          onClick={() => setShowMobileTools(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                        >
                          <X className="w-6 h-6 text-white" />
                          <span className="text-white text-base font-medium">Close</span>
                        </button>

                        {/* Goal Button */}
                        {(() => {
                          const hasActiveGoal = goals.some(g => g.isActive && !g.isCompleted);
                          return (
                            <button
                              onClick={() => {
                                if (hasActiveGoal) return;
                                setEditingGoal(null);
                                setShowGoalModal(true);
                                setShowMobileTools(false);
                              }}
                              disabled={hasActiveGoal}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                hasActiveGoal
                                  ? 'bg-gray-600/30 opacity-50'
                                  : 'bg-cyan-500/20 hover:bg-cyan-500/30'
                              }`}
                            >
                              <Target className={`w-6 h-6 ${hasActiveGoal ? 'text-gray-500' : 'text-cyan-400'}`} />
                              <span className={`text-base font-medium ${hasActiveGoal ? 'text-gray-500' : 'text-cyan-400'}`}>Goal</span>
                            </button>
                          );
                        })()}

                        {/* Poll Button */}
                        <button
                          onClick={() => {
                            setShowCreatePollModal(true);
                            setShowMobileTools(false);
                          }}
                          disabled={!!activePoll?.isActive}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            activePoll?.isActive
                              ? 'bg-purple-500/30'
                              : 'bg-purple-500/20 hover:bg-purple-500/30'
                          }`}
                        >
                          <BarChart2 className="w-6 h-6 text-purple-400" />
                          <span className="text-base font-medium text-purple-400">Poll</span>
                        </button>

                        {/* Timer Button */}
                        <button
                          onClick={() => {
                            setShowCreateCountdownModal(true);
                            setShowMobileTools(false);
                          }}
                          disabled={!!activeCountdown?.isActive}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            activeCountdown?.isActive
                              ? 'bg-cyan-500/30'
                              : 'bg-cyan-500/20 hover:bg-cyan-500/30'
                          }`}
                        >
                          <Clock className="w-6 h-6 text-cyan-400" />
                          <span className="text-base font-medium text-cyan-400">Timer</span>
                        </button>

                        {/* VIP Button */}
                        {!announcedTicketedStream && (
                          <button
                            onClick={() => {
                              setShowAnnounceModal(true);
                              setShowMobileTools(false);
                            }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-all"
                          >
                            <Ticket className="w-6 h-6 text-amber-400" />
                            <span className="text-base font-medium text-amber-400">VIP</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Collapsed Tools button - prominent with label */
                      <button
                        onClick={() => setShowMobileTools(true)}
                        className="flex items-center gap-2 px-4 py-3 backdrop-blur-xl bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full border-2 border-cyan-400/50 hover:border-cyan-400 active:scale-95 transition-all shadow-xl shadow-cyan-500/20"
                        title="Stream Tools"
                        aria-label="Open stream tools menu"
                      >
                        <Plus className="w-6 h-6 text-white" />
                        <span className="text-white font-semibold text-sm">Tools</span>
                      </button>
                    )}
                  </div>

                  {/* Ticketed Stream Indicator - Shows on both mobile and desktop */}
                  {announcedTicketedStream && (
                    <div className="absolute top-52 md:top-auto md:bottom-14 left-3 z-20">
                      {vipModeActive ? (
                        // Ticketed Mode Active
                        <div className="flex items-center gap-2 px-3 py-2 backdrop-blur-xl bg-red-500/30 rounded-xl border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                          <div className="text-left min-w-0">
                            <div className="text-red-400 font-bold text-xs uppercase">LIVE</div>
                            <div className="text-white text-xs truncate max-w-[120px] sm:max-w-[180px]">
                              {announcedTicketedStream.title}
                            </div>
                          </div>
                          <button
                            onClick={handleEndVipStream}
                            className="ml-1 flex items-center gap-1 px-2.5 py-1.5 bg-red-500/80 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all shadow-lg flex-shrink-0"
                          >
                            <Square className="w-3 h-3" />
                            End
                          </button>
                        </div>
                      ) : (
                        // Ticketed Mode Not Started Yet - with countdown
                        <div className="flex items-center gap-2 px-3 py-2 backdrop-blur-xl bg-amber-500/20 rounded-xl border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                          <Ticket className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <div className="text-left min-w-0">
                            <div className="text-white text-xs font-medium truncate max-w-[100px] sm:max-w-[150px]">
                              {announcedTicketedStream.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-amber-400/80">
                                <Coins className="w-3 h-3 inline" /> {announcedTicketedStream.ticketPrice}
                              </span>
                              {vipTicketCount > 0 && (
                                <span className="text-green-400 font-medium">
                                  {vipTicketCount} sold
                                </span>
                              )}
                            </div>
                            {/* Countdown Timer */}
                            {ticketedCountdown && (
                              <div className="text-cyan-400 text-[10px] font-mono font-semibold mt-0.5">
                                ⏱ {ticketedCountdown}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleStartVipStream}
                            disabled={startingVipStream}
                            className="ml-1 flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 shadow-lg flex-shrink-0"
                          >
                            {startingVipStream ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span className="hidden sm:inline">Start</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Desktop Record + Clip + End Stream Buttons */}
                  <div className="absolute bottom-3 left-3 z-20 hidden md:flex flex-row items-center gap-2">
                    {/* Record Button */}
                    <StreamRecordButton
                      isRecording={isRecording}
                      currentDuration={formattedDuration}
                      maxDuration={maxDuration}
                      recordingsCount={recordings.length}
                      maxRecordings={maxRecordings}
                      onStartRecording={startRecording}
                      onStopRecording={stopRecording}
                    />

                    {/* Clip Button */}
                    {clipIsSupported && (
                      <StreamClipButton
                        canClip={canClip}
                        isClipping={clipIsClipping}
                        bufferSeconds={clipBufferSeconds}
                        cooldownRemaining={clipCooldownRemaining}
                        onClip={handleCreateClip}
                      />
                    )}

                    {/* End Stream Button */}
                    <button
                      onClick={() => {
                        // If recording, stop it first
                        if (isRecording) {
                          stopRecording();
                        }
                        setIsLeaveAttempt(false);
                        setShowEndConfirm(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 backdrop-blur-xl bg-red-500/20 rounded-full border border-red-500/50 text-white font-semibold hover:bg-red-500/30 transition-all flex-shrink-0"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span className="text-red-400 text-sm font-semibold">End</span>
                    </button>
                  </div>

                  {/* Username Watermark - Shown on both mobile and desktop */}
                  {!showStreamSummary && !showSaveRecordingsModal && !showEndConfirm && currentUsername && (
                    <div className="absolute bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                      <span
                        className="text-lg md:text-xl font-semibold tracking-wide whitespace-nowrap font-[family-name:var(--font-poppins)]"
                        style={{
                          color: '#ffffff',
                          textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        digis.cc/{currentUsername}
                      </span>
                    </div>
                  )}

                  {/* Spotlighted Creator Overlay */}
                  <SpotlightedCreatorOverlay streamId={streamId} isHost={true} />

                  {/* Guest Video Overlay */}
                  {activeGuest && (
                    <GuestVideoOverlay
                      guestUserId={activeGuest.userId}
                      guestUsername={activeGuest.username}
                      guestDisplayName={activeGuest.displayName}
                      guestAvatarUrl={activeGuest.avatarUrl}
                      requestType={activeGuest.requestType}
                      isHost={true}
                      onRemoveGuest={async () => {
                        try {
                          await fetch(`/api/streams/${streamId}/guest/remove`, { method: 'POST' });
                          setActiveGuest(null);
                        } catch (err) {
                          console.error('Failed to remove guest:', err);
                        }
                      }}
                    />
                  )}

                  {/* Active Poll Overlay */}
                  {activePoll && activePoll.isActive && (
                    <div className="absolute bottom-36 md:bottom-20 left-3 z-40 w-[180px] sm:w-[260px]">
                      <StreamPoll
                        poll={activePoll}
                        isBroadcaster={true}
                        streamId={streamId}
                        onPollEnded={() => setActivePoll(null)}
                        onVoted={fetchPoll}
                      />
                    </div>
                  )}

                  {/* Active Countdown Overlay */}
                  {activeCountdown && activeCountdown.isActive && (
                    <div className="absolute bottom-20 right-3 z-40 w-[180px]">
                      <StreamCountdown
                        countdown={activeCountdown}
                        isBroadcaster={true}
                        streamId={streamId}
                        onCountdownEnded={() => setActiveCountdown(null)}
                      />
                    </div>
                  )}

{/* VideoControls removed - host doesn't need volume control for their own broadcast */}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-black">
                  <LoadingSpinner size="lg" />
                  <p className="text-white/80 mt-4 text-lg font-semibold">Starting camera...</p>
                  <p className="text-white/50 text-sm mt-1">Connecting to stream server</p>
                  <button
                    onClick={() => {
                      setError('');
                      fetchBroadcastToken();
                    }}
                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm font-medium transition-colors border border-white/20"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>

            {/* Active Goals - Inline below video on desktop */}
            {goals.length > 0 && goals.some(g => g.isActive && !g.isCompleted) && (
              <div className="hidden lg:block mt-3">
                <TronGoalBar
                  goals={goals.filter(g => g.isActive && !g.isCompleted).map(g => ({
                    id: g.id,
                    title: g.title || 'Stream Goal',
                    description: g.description,
                    rewardText: g.rewardText,
                    targetAmount: g.targetAmount,
                    currentAmount: g.currentAmount,
                  }))}
                  onEdit={(goalId) => {
                    const goalToEdit = goals.find(g => g.id === goalId);
                    if (goalToEdit) {
                      setEditingGoal(goalToEdit);
                      setShowGoalModal(true);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Chat Sidebar + Top Gifters */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className={`${isPortraitDevice ? 'h-[500px]' : 'h-[400px]'} lg:h-[500px] backdrop-blur-xl bg-black/60 rounded-2xl border border-white/10 overflow-hidden`}>
              <StreamChat
                streamId={streamId}
                messages={messages}
                isCreator={true}
                onSendMessage={handleSendMessage}
                onMessageDeleted={fetchMessages}
                pinnedMessage={pinnedMessage}
                onPinMessage={handlePinMessage}
                menuEnabled={menuEnabled}
                menuItems={menuItems}
                onMenuClose={() => {
                  // Hide menu when X is clicked
                  setMenuEnabled(false);
                  fetch(`/api/streams/${streamId}/tip-menu`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: false }),
                  }).catch(console.error);
                }}
              />
            </div>

            {/* Featured Creators Panel - Desktop only (collapsed by default) */}
            <div className="hidden lg:block">
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

        {/* Featured Creators Panel - Mobile only (collapsed by default) */}
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
            showSuccess('Stream saved! You can find it in your VOD library.');
          }}
        />
      )}

      {/* Save Recordings Modal - Shows after stream ends if there are recordings */}
      {showSaveRecordingsModal && recordings.length > 0 && (
        <SaveRecordingsModal
          recordings={recordings}
          streamId={streamId}
          onClose={() => {
            setShowSaveRecordingsModal(false);
            setShowStreamSummary(true);
          }}
          onSaveComplete={() => {
            setShowSaveRecordingsModal(false);
            setShowStreamSummary(true);
            showSuccess('Recordings saved! They will appear in your Streams tab.');
          }}
          formatDuration={formatRecordingDuration}
        />
      )}

      {/* Announce Ticketed Stream Modal */}
      {showAnnounceModal && (
        <AnnounceTicketedStreamModal
          streamId={streamId}
          currentViewers={viewerCount}
          onClose={() => setShowAnnounceModal(false)}
          onSuccess={(ticketedStream) => {
            setShowAnnounceModal(false);
            setAnnouncedTicketedStream(ticketedStream);
            // The announcement is sent to chat via Ably in the API
          }}
        />
      )}

      {/* QR Code Modal - Monitor on Phone */}
      {showQRCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowQRCode(false)}
        >
          <div
            className="bg-gray-900 rounded-2xl p-6 max-w-sm mx-4 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Remote Control</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Scan with your phone to control your stream remotely
              </p>
              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/stream/control/${streamId}`}
                  size={180}
                  level="M"
                />
              </div>
              <p className="text-gray-500 text-xs mb-4">
                Chat, goals, polls, VIP shows & moderation from your phone
              </p>
              <button
                onClick={() => setShowQRCode(false)}
                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Tips Button - Floating */}
      <button
        onClick={() => {
          setShowPrivateTips(!showPrivateTips);
          setHasNewPrivateTips(false);
        }}
        className={`fixed bottom-24 right-4 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
          privateTips.length > 0
            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
            : 'bg-white/10 text-white/60 border border-white/20 backdrop-blur-xl'
        }`}
        title="Private Tip Notes"
      >
        <Lock className="w-5 h-5" />
        {hasNewPrivateTips && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
        {privateTips.length > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-cyan-500 rounded-full text-xs font-bold flex items-center justify-center">
            {privateTips.length}
          </span>
        )}
      </button>

      {/* Private Tips Panel - Slide-in from right */}
      {showPrivateTips && (
        <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-sm">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm -left-full"
            style={{ width: '200vw' }}
            onClick={() => setShowPrivateTips(false)}
          />
          {/* Panel */}
          <div className="relative h-full bg-gradient-to-br from-slate-900/98 via-purple-900/98 to-slate-900/98 backdrop-blur-xl border-l border-cyan-500/30 shadow-[-4px_0_30px_rgba(34,211,238,0.2)] flex flex-col animate-slideInRight">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white">Private Tip Notes</h3>
              </div>
              <button
                onClick={() => setShowPrivateTips(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Tips List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {privateTips.length === 0 ? (
                <div className="text-center py-10">
                  <Lock className="w-12 h-12 mx-auto text-cyan-400/40 mb-4" />
                  <p className="text-white/60 text-sm">
                    Private notes from fans will appear here
                  </p>
                  <p className="text-white/40 text-xs mt-2">
                    Only you can see these messages
                  </p>
                </div>
              ) : (
                privateTips.map((tip) => (
                  <div
                    key={tip.id}
                    className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center text-xs font-bold text-white">
                          {tip.senderUsername?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="font-bold text-cyan-300 text-sm">@{tip.senderUsername}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-500/30">
                        <Coins className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400 text-sm font-bold">{tip.amount}</span>
                      </div>
                    </div>
                    <p className="text-white/90 text-sm italic pl-10">"{tip.note}"</p>
                    <div className="flex items-center justify-end mt-2">
                      <span className="text-white/40 text-xs">
                        {new Date(tip.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Info Footer */}
            <div className="p-4 border-t border-cyan-500/20 bg-black/30">
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Private notes are only visible to you</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for slide animation */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>

      {/* Floating Tron Goal Bar - mobile only (desktop shows inline below video) */}
      {goals.length > 0 && goals.some(g => g.isActive && !g.isCompleted) && (
        <div className="lg:hidden fixed top-28 left-3 z-40 w-[50%] max-w-[200px]">
          <TronGoalBar
            goals={goals.filter(g => g.isActive && !g.isCompleted).map(g => ({
              id: g.id,
              title: g.title || 'Stream Goal',
              description: g.description,
              rewardText: g.rewardText,
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
            }))}
            onEdit={(goalId) => {
              const goalToEdit = goals.find(g => g.id === goalId);
              if (goalToEdit) {
                setEditingGoal(goalToEdit);
                setShowGoalModal(true);
              }
            }}
            onCancel={async (goalId) => {
              try {
                await fetch(`/api/streams/${streamId}/goals`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ goalId }),
                });
                setGoals(prev => prev.filter(g => g.id !== goalId));
              } catch (err) {
                console.error('Failed to cancel goal:', err);
              }
            }}
          />
        </div>
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
