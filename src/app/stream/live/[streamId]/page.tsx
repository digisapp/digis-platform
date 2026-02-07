'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import { StreamChat } from '@/components/streaming/StreamChat';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { SetGoalModal } from '@/components/streaming/SetGoalModal';
import { SaveStreamModal } from '@/components/streaming/SaveStreamModal';
import { StreamSummaryModal } from '@/components/streaming/StreamSummaryModal';
import { StreamEndConfirmationModal } from '@/components/streaming/StreamEndConfirmationModal';
import { VipShowChoiceModal } from '@/components/streaming/VipShowChoiceModal';
import { MobileToolsPanel } from '@/components/streaming/MobileToolsPanel';
import { StreamErrorBoundary } from '@/components/error-boundaries';
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
import {
  LocalCameraPreview,
  ScreenShareControl,
  CameraFlipControl,
  RemoteControlQRModal,
  PrivateTipsButton,
  PrivateTipsPanel,
  TopGiftersLeaderboard,
  ReconnectionOverlay,
  VipShowIndicator,
} from '@/components/streaming/broadcast';
import { useStreamChat } from '@/hooks/useStreamChat';
import { useStreamRecorder } from '@/hooks/useStreamRecorder';
import { useStreamClipper } from '@/hooks/useStreamClipper';
import { useStreamNavPrevention } from '@/hooks/useStreamNavPrevention';
import { usePrivateTips } from '@/hooks/usePrivateTips';
import { useGoalCelebrations } from '@/hooks/useGoalCelebrations';
import { useStreamDuration } from '@/hooks/useStreamDuration';
import { useStreamEndHandling } from '@/hooks/useStreamEndHandling';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { useStreamHeartbeat } from '@/hooks/useStreamHeartbeat';
import { useStreamAutoEnd } from '@/hooks/useStreamAutoEnd';
import { useConnectionTimeout } from '@/hooks/useConnectionTimeout';
import { useBroadcasterData, MAX_CHAT_MESSAGES } from '@/hooks/useBroadcasterData';
import { useVipShow } from '@/hooks/useVipShow';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Coins, Target, Ticket, Lock, List, BarChart2, Clock, Smartphone, Monitor } from 'lucide-react';
import type { StreamMessage, StreamGoal } from '@/db/schema';
import { useToastContext } from '@/context/ToastContext';

export default function BroadcastStudioPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showInfo } = useToastContext();
  const streamId = params.streamId as string;

  // Get device IDs from URL params (passed from go-live page for faster startup)
  const preferredVideoDevice = searchParams.get('video') || undefined;
  const preferredAudioDevice = searchParams.get('audio') || undefined;

  // --- Consolidated data hook (state + fetching) ---
  const {
    stream, setStream,
    messages, setMessages,
    token, setToken,
    serverUrl,
    loading,
    error, setError,
    viewerCount, setViewerCount,
    peakViewers, setPeakViewers,
    totalEarnings, setTotalEarnings,
    goals, setGoals,
    completedGoalIds,
    activePoll, setActivePoll,
    activeCountdown, setActiveCountdown,
    menuEnabled, setMenuEnabled,
    menuItems,
    leaderboard,
    streamOrientation,
    announcedTicketedStream, setAnnouncedTicketedStream,
    vipModeActive, setVipModeActive,
    currentUserId,
    currentUsername,
    fetchGoals,
    fetchLeaderboard,
    fetchPoll,
    fetchCountdown,
    fetchMessages,
    fetchBroadcastToken,
  } = useBroadcasterData({ streamId, showError });

  // --- UI-only state ---
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hasManuallyEnded, setHasManuallyEnded] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StreamGoal | null>(null);

  // Extracted hooks
  const { showEndConfirm, setShowEndConfirm, isLeaveAttempt, setIsLeaveAttempt } = useStreamNavPrevention({
    isLive: !!stream && stream.status === 'live',
    hasManuallyEnded,
  });
  const { celebratingGoal, completedGoalsQueue, addCompletedGoal } = useGoalCelebrations();
  const { isPortraitDevice, isLandscape, isSafari } = useDeviceOrientation();
  const { currentTime, formattedDuration: liveDuration, formatDuration } = useStreamDuration(stream?.startedAt);

  const [showStreamSummary, setShowStreamSummary] = useState(false);
  const [showSaveStreamModal, setShowSaveStreamModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');

  // Heartbeat, auto-end, and connection timeout hooks
  useStreamHeartbeat({ streamId, isLive: !!stream && stream.status === 'live' });
  useStreamAutoEnd({ streamId, isLive: !!stream && stream.status === 'live', hasManuallyEnded });
  useConnectionTimeout({ status: connectionStatus, setStatus: setConnectionStatus });
  const [pinnedMessage, setPinnedMessage] = useState<StreamMessage | null>(null);
  const [showPrivateTips, setShowPrivateTips] = useState(false);
  const { privateTips, hasNewPrivateTips, setHasNewPrivateTips } = usePrivateTips({
    userId: currentUserId,
    isVisible: showPrivateTips,
  });
  const [showMobileTools, setShowMobileTools] = useState(true); // Expanded by default for host

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

  // Stream end handling hook
  const {
    isEnding,
    vipTicketCount,
    showVipEndChoice,
    setShowVipEndChoice,
    setVipTicketCount,
    streamSummary,
    handleEndStream,
    handleEndStreamKeepVip,
    handleEndStreamCancelVip,
  } = useStreamEndHandling({
    streamId,
    announcedTicketedStream,
    vipModeActive,
    peakViewers,
    viewerCount,
    totalEarnings,
    formatDuration,
    recordings,
    showError,
    setToken,
    setHasManuallyEnded,
    setShowEndConfirm,
    setShowSaveRecordingsModal,
    setShowStreamSummary,
    setAnnouncedTicketedStream: (s) => setAnnouncedTicketedStream(s),
  });

  // VIP show hook (countdown, ticket polling, start/end handlers)
  const {
    ticketedCountdown,
    startingVipStream,
    handleStartVipStream,
    handleEndVipStream,
  } = useVipShow({
    streamId,
    announcedTicketedStream,
    vipModeActive,
    setVipModeActive,
    setAnnouncedTicketedStream,
    setVipTicketCount,
    showError,
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

  // Clear pinned message if the source message was deleted
  useEffect(() => {
    if (pinnedMessage && !messages.some(m => m.id === pinnedMessage.id)) {
      setPinnedMessage(null);
    }
  }, [messages, pinnedMessage]);

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
        const next = [...prev, streamMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
    },
    onGift: (giftEvent) => {
      setTotalEarnings((prev) => prev + (giftEvent.streamGift.quantity || 1) * (giftEvent.gift.coinCost || 0));
      // Add floating emoji for the gift (limit to 50 to prevent memory issues on long streams)
      if (giftEvent.gift) {
        setFloatingGifts(prev => {
          const newGift = {
            id: `gift-${Date.now()}-${Math.random()}`,
            emoji: giftEvent.gift.emoji,
            rarity: giftEvent.gift.rarity,
            timestamp: Date.now(),
            giftName: giftEvent.gift.name  // Include gift name for specific sounds
          };
          const updated = [...prev, newGift];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });
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
      setMessages((prev) => {
        const next = [...prev, giftMessage as unknown as StreamMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
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
      setMessages((prev) => {
        const next = [...prev, tipMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });

      // Add floating emoji for visual feedback (limit to 50 to prevent memory issues)
      setFloatingGifts(prev => {
        const newTip = {
          id: `tip-${Date.now()}-${Math.random()}`,
          emoji,
          rarity: tipData.amount >= 100 ? 'epic' : tipData.amount >= 50 ? 'rare' : 'common',
          timestamp: Date.now()
        };
        const updated = [...prev, newTip];
        return updated.length > 50 ? updated.slice(-50) : updated;
      });
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
      // Add to celebration queue if goal completed (queue processes one at a time)
      if (update.action === 'completed' && update.goal) {
        addCompletedGoal({
          id: update.goal.id || `goal-${Date.now()}`,
          title: update.goal.title || 'Stream Goal',
          rewardText: update.goal.rewardText || 'Goal reached!',
        });
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

  // handleEndStream, handleEndStreamKeepVip, handleEndStreamCancelVip, fetchStreamSummary
  // are now provided by useStreamEndHandling hook

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
          const next = [...prev, data.message as StreamMessage];
          return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
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
        <Image src="/images/digis-logo-white.png" alt="Digis" width={100} height={28} className="h-7" />
      </div>

      <div className="relative z-10">
      {/* Floating Gift Emojis Overlay */}
      <GiftFloatingEmojis gifts={floatingGifts} onComplete={removeFloatingGift} />

      {/* Goal Completed Celebration (Queue-based - shows all completed goals one by one) */}
      {celebratingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{celebratingGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{celebratingGoal.rewardText}</span>
            </div>
            {/* Show queue indicator if more goals are pending */}
            {completedGoalsQueue.length > 0 && (
              <div className="mt-3 text-sm text-gray-400">
                +{completedGoalsQueue.length} more goal{completedGoalsQueue.length > 1 ? 's' : ''} unlocked!
              </div>
            )}
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
        <StreamEndConfirmationModal
          isLeaveAttempt={isLeaveAttempt}
          isEnding={isEnding}
          onEndStream={handleEndStream}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      {/* VIP Show Choice Modal - When ending stream with pending VIP show */}
      {showVipEndChoice && announcedTicketedStream && (
        <VipShowChoiceModal
          announcedTicketedStream={announcedTicketedStream}
          vipTicketCount={vipTicketCount}
          isEnding={isEnding}
          onKeepVip={handleEndStreamKeepVip}
          onCancelVip={handleEndStreamCancelVip}
          onClose={() => setShowVipEndChoice(false)}
        />
      )}

      {/* Stream Summary Modal */}
      {showStreamSummary && streamSummary && (
        <StreamSummaryModal
          summary={streamSummary}
          onClose={() => router.push('/creator/dashboard')}
        />
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
                    ? 'h-[calc(100dvh-120px)] w-auto mx-auto aspect-[9/16]' // Landscape device viewing portrait stream
                    : 'aspect-[9/16] max-h-[80dvh] sm:max-h-[70dvh]' // Portrait device viewing portrait stream
                  : 'aspect-video'
              }`}
              data-lk-video-container
            >
              {token && serverUrl ? (
                <>
                  <StreamErrorBoundary streamId={streamId} onLeave={() => router.push('/creator/dashboard')}>
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
                    <ReconnectionOverlay
                      connectionStatus={connectionStatus}
                      onReconnect={() => {
                        setConnectionStatus('connecting');
                        window.location.reload();
                      }}
                    />
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
                  </StreamErrorBoundary>
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
                    <MobileToolsPanel
                      showMobileTools={showMobileTools}
                      onToggle={setShowMobileTools}
                      goals={goals}
                      activePoll={activePoll}
                      activeCountdown={activeCountdown}
                      announcedTicketedStream={announcedTicketedStream}
                      onGoalClick={() => {
                        setEditingGoal(null);
                        setShowGoalModal(true);
                      }}
                      onPollClick={() => setShowCreatePollModal(true)}
                      onCountdownClick={() => setShowCreateCountdownModal(true)}
                      onVipClick={() => setShowAnnounceModal(true)}
                    />
                  </div>

                  {/* Ticketed Stream Indicator - Shows on both mobile and desktop */}
                  {announcedTicketedStream && (
                    <div className="absolute top-52 md:top-auto md:bottom-14 left-3 z-20">
                      <VipShowIndicator
                        announcedTicketedStream={announcedTicketedStream}
                        vipModeActive={vipModeActive}
                        ticketedCountdown={ticketedCountdown}
                        vipTicketCount={vipTicketCount}
                        startingVipStream={startingVipStream}
                        onStartVip={handleStartVipStream}
                        onEndVip={handleEndVipStream}
                      />
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
            <div className="hidden lg:block">
              <TopGiftersLeaderboard leaderboard={leaderboard} maxHeight="180px" />
            </div>
          </div>
        </div>

        {/* Featured Creators Panel - Mobile only (collapsed by default) */}
        <div className="lg:hidden mt-4">
          <FeaturedCreatorsPanel streamId={streamId} isHost={true} />
        </div>

        {/* Top Gifters Leaderboard - Mobile only (below chat) */}
        <div className="lg:hidden mt-4 mb-8">
          <TopGiftersLeaderboard leaderboard={leaderboard} compact />
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
      <RemoteControlQRModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        streamId={streamId}
      />

      {/* Private Tips Button - Floating */}
      <PrivateTipsButton
        onClick={() => {
          setShowPrivateTips(!showPrivateTips);
          setHasNewPrivateTips(false);
        }}
        tipCount={privateTips.length}
        hasNewTips={hasNewPrivateTips}
      />

      {/* Private Tips Panel - Slide-in from right */}
      <PrivateTipsPanel
        isOpen={showPrivateTips}
        onClose={() => setShowPrivateTips(false)}
        tips={privateTips}
      />

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
