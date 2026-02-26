'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { streamAnalytics } from '@/lib/utils/analytics';
import { useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import '@livekit/components-styles';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useStreamClipper } from '@/hooks/useStreamClipper';
import { useGoalCelebrations } from '@/hooks/useGoalCelebrations';
import { useViewerHeartbeat } from '@/hooks/useViewerHeartbeat';
import { useWaitingRoomMusic } from '@/hooks/useWaitingRoomMusic';
import { useTicketCountdown } from '@/hooks/useTicketCountdown';
import { useViewerKeyboardShortcuts } from '@/hooks/useViewerKeyboardShortcuts';
import { useBRBDetection } from '@/hooks/useBRBDetection';
import { useViewerData } from '@/hooks/useViewerData';
import { useViewerInteractions } from '@/hooks/useViewerInteractions';
import { useViewerAblyHandlers } from '@/hooks/useViewerAblyHandlers';
import { useToastContext } from '@/context/ToastContext';
import { useTicketPurchaseFlow } from '@/hooks/useTicketPurchaseFlow';
import { AccessDeniedScreen } from '@/components/streaming/AccessDeniedScreen';
import { StreamHeaderBar } from '@/components/streaming/StreamHeaderBar';
import { ViewerVideoArea, ViewerFloatingElements } from '@/components/streaming/viewer';

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
  messageType?: 'chat' | 'tip' | 'gift' | 'ticket_purchase' | 'menu_purchase' | 'menu_order' | 'menu_tip';
  tipAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftQuantity?: number;
  ticketPrice?: number;
  showTitle?: string;
}

// Component to render the remote video from broadcaster
function ViewerVideo({ onBroadcasterLeft }: { onBroadcasterLeft?: () => void }) {
  const participants = useRemoteParticipants();
  const broadcaster = participants[0];
  const prevBroadcasterRef = React.useRef(broadcaster);

  React.useEffect(() => {
    if (prevBroadcasterRef.current && !broadcaster) {
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
      className="w-full h-full object-cover"
    />
  );
}

export default function TheaterModePage() {
  const params = useParams();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToastContext();
  const streamId = params.streamId as string;

  // UI state
  const [showChat, setShowChat] = useState(true);
  const [showViewerList, setShowViewerList] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const { celebratingGoal, completedGoalsQueue, addCompletedGoal } = useGoalCelebrations();

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [showBRB, setShowBRB] = useState(false);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);

  // Chat state
  const MAX_CHAT_MESSAGES = 200;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const displayMessages = useMemo(() => {
    return [...messages].slice(-50).reverse();
  }, [messages]);

  // User state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);

  // Ticket purchase flow
  const {
    ticketedModeActive, setTicketedModeActive,
    hasTicket, setHasTicket,
    ticketedShowInfo, setTicketedShowInfo,
    purchasingTicket,
    showQuickBuyModal, setShowQuickBuyModal,
    quickBuyInfo, setQuickBuyInfo,
    quickBuyLoading,
    hasPurchasedUpcomingTicket, setHasPurchasedUpcomingTicket,
    showTicketPurchaseSuccess,
    ticketedAnnouncement, setTicketedAnnouncement,
    dismissedTicketedStream, setDismissedTicketedStream,
    upcomingTicketedShow, setUpcomingTicketedShow,
    checkTicketAccess,
    abortPendingTicketCheck,
    handleInstantTicketPurchase,
    handleQuickBuyTicket,
  } = useTicketPurchaseFlow({
    streamId,
    currentUser,
    userBalance,
    setUserBalance,
    showError,
    setShowBuyCoinsModal: (show: boolean) => setShowBuyCoinsModal(show),
    routerPush: (path: string) => router.push(path),
  });

  // Consolidated data fetching
  const {
    stream, setStream,
    loading, setLoading,
    error,
    accessDenied, setAccessDenied,
    token, serverUrl,
    streamOrientation,
    menuItems, setMenuItems,
    menuEnabled, setMenuEnabled,
    activePoll, setActivePoll,
    activeCountdown, setActiveCountdown,
    activeGuest, setActiveGuest,
    viewers, leaderboard,
    loadStream, loadCurrentUser, fetchPoll, fetchCountdown,
  } = useViewerData({
    streamId,
    showViewerList,
    dismissedTicketedStream,
    ticketedAnnouncement,
    setUpcomingTicketedShow,
    setCurrentUser,
    setUserBalance,
  });

  const ticketCountdown = useTicketCountdown(upcomingTicketedShow?.startsAt || dismissedTicketedStream?.startsAt || null);

  // Clip watermark config
  const clipWatermark = useMemo(() =>
    stream?.creator.username
      ? { logoUrl: '/images/digis-logo-white.png', creatorUsername: stream.creator.username }
      : undefined,
    [stream?.creator.username]
  );

  const {
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

  // Viewer interactions (chat, tips, gifts, share, clips)
  const {
    messageInput, setMessageInput,
    sendingMessage,
    sendMessage,
    handleTip,
    handleSendGift,
    shareStream,
    handleCreateClip,
    digitalDownload, setDigitalDownload,
    floatingGifts, setFloatingGifts,
    removeFloatingGift,
  } = useViewerInteractions({
    streamId,
    stream,
    currentUser,
    userBalance,
    setUserBalance,
    showSuccess,
    showError,
    showInfo,
    clipIt,
    clipBufferSeconds,
    setClipIsClipping,
    loadStream,
    setMessages,
    MAX_CHAT_MESSAGES,
  });

  // Real-time Ably handlers
  const { displayViewerCount } = useViewerAblyHandlers({
    streamId,
    stream,
    currentUser,
    setStream,
    setMessages,
    setFloatingGifts,
    loadStream,
    addCompletedGoal,
    setStreamEnded,
    setTicketedAnnouncement,
    checkTicketAccess,
    abortPendingTicketCheck,
    setTicketedModeActive,
    setTicketedShowInfo,
    setHasTicket,
    setHasPurchasedUpcomingTicket,
    setDismissedTicketedStream,
    setUpcomingTicketedShow,
    setMenuEnabled,
    setMenuItems,
    menuItems,
    setActivePoll,
    setActiveCountdown,
    setActiveGuest,
    fetchPoll,
    fetchCountdown,
    MAX_CHAT_MESSAGES,
  });

  // Play waiting room music for non-ticket holders during ticketed streams
  useWaitingRoomMusic({
    shouldPlay: !!(ticketedModeActive && !hasTicket && ticketedShowInfo),
  });

  // Check ticket access on mount
  useEffect(() => {
    checkTicketAccess();
  }, [streamId]);

  // Join stream when viewer loads
  useEffect(() => {
    if (!currentUser || !stream || stream.status !== 'live') return;
    const joinStream = async () => {
      try {
        await fetch(`/api/streams/${streamId}/join`, { method: 'POST' });
      } catch (e) {
        console.error('[Stream] Failed to join stream:', e);
      }
    };
    joinStream();
  }, [currentUser, stream?.status, streamId]);

  // Track view
  useEffect(() => {
    if (stream && currentUser) {
      streamAnalytics.viewedInline(currentUser.username, streamId);
    }
  }, [stream, currentUser, streamId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        chatContainerRef.current.scrollTop = 0;
      } else {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  const handleBroadcasterLeft = useCallback(() => {
    setStreamEnded(true);
  }, []);

  // BRB detection
  useBRBDetection({
    streamId,
    isLive: stream?.status === 'live',
    streamEnded,
    onBRBChange: setShowBRB,
    onStreamAutoEnd: () => setStreamEnded(true),
  });

  // Viewer heartbeat
  useViewerHeartbeat({
    streamId,
    isLive: stream?.status === 'live',
    streamEnded,
    isAuthenticated: !!currentUser,
    onViewerCount: (currentViewers, peakViewers) => {
      setStream(prev => prev ? { ...prev, currentViewers, peakViewers } : null);
    },
  });

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !muted;
    setMuted(newMutedState);
    if (!newMutedState) setShowUnmutePrompt(false);
    if (videoRef.current) videoRef.current.muted = newMutedState;
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

  // Keyboard shortcuts
  useViewerKeyboardShortcuts({
    onToggleMute: toggleMute,
    onToggleFullscreen: toggleFullscreen,
    onToggleChat: () => setShowChat(prev => !prev),
    isFullscreen,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <AccessDeniedScreen
        accessDenied={accessDenied}
        onRetryAccess={() => {
          setAccessDenied(null);
          setLoading(true);
          loadStream();
        }}
        onNavigate={(path) => router.push(path)}
      />
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
            onClick={() => router.push('/streams')}
            className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-xl font-semibold hover:scale-105 transition-all"
          >
            Browse Live Streams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white flex flex-col lg:pl-16">
      {/* Mobile Logo Header */}
      <div
        className="lg:hidden flex items-center justify-center py-2 bg-black border-b border-cyan-400/30"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top, 8px))' }}
      >
        <button onClick={() => router.push('/')} className="flex items-center">
          <img src="/images/digis-logo-white.png" alt="Digis" className="h-6" />
        </button>
      </div>

      {/* Header Bar */}
      <StreamHeaderBar
        creator={stream.creator}
        viewerCount={displayViewerCount}
        muted={muted}
        showChat={showChat}
        streamEnded={streamEnded}
        clipIsSupported={clipIsSupported}
        canClip={canClip}
        clipIsClipping={clipIsClipping}
        clipBufferSeconds={clipBufferSeconds}
        clipCooldownRemaining={clipCooldownRemaining}
        onBack={() => router.back()}
        onToggleMute={toggleMute}
        onShare={shareStream}
        onCreateClip={handleCreateClip}
        onToggleChat={() => setShowChat(!showChat)}
      />

      {/* Main Content */}
      <ViewerVideoArea
        stream={stream}
        streamId={streamId}
        token={token}
        serverUrl={serverUrl}
        streamOrientation={streamOrientation}
        muted={muted}
        isFullscreen={isFullscreen}
        streamEnded={streamEnded}
        showBRB={showBRB}
        showChat={showChat}
        showViewerList={showViewerList}
        showUnmutePrompt={showUnmutePrompt}
        displayViewerCount={displayViewerCount}
        currentUser={currentUser}
        userBalance={userBalance}
        messages={messages}
        displayMessages={displayMessages}
        messageInput={messageInput}
        sendingMessage={sendingMessage}
        chatContainerRef={chatContainerRef}
        menuEnabled={menuEnabled}
        menuItems={menuItems}
        activePoll={activePoll}
        activeCountdown={activeCountdown}
        activeGuest={activeGuest}
        ticketedModeActive={ticketedModeActive}
        hasTicket={hasTicket}
        ticketedShowInfo={ticketedShowInfo}
        purchasingTicket={purchasingTicket}
        upcomingTicketedShow={upcomingTicketedShow}
        dismissedTicketedStream={dismissedTicketedStream}
        ticketedAnnouncement={ticketedAnnouncement}
        hasPurchasedUpcomingTicket={hasPurchasedUpcomingTicket}
        ticketCountdown={ticketCountdown}
        viewers={viewers}
        leaderboard={leaderboard}
        toggleMute={toggleMute}
        toggleFullscreen={toggleFullscreen}
        sendMessage={sendMessage}
        handleSendGift={handleSendGift}
        handleInstantTicketPurchase={handleInstantTicketPurchase}
        handleBroadcasterLeft={handleBroadcasterLeft}
        onSetMessageInput={setMessageInput}
        onSetShowViewerList={setShowViewerList}
        onSetShowTipModal={setShowTipModal}
        onSetShowMenuModal={setShowMenuModal}
        onSetShowBuyCoinsModal={setShowBuyCoinsModal}
        onSetStreamEnded={setStreamEnded}
        onSetActivePoll={setActivePoll}
        onSetActiveCountdown={setActiveCountdown}
        onSetQuickBuyInfo={setQuickBuyInfo}
        onSetShowQuickBuyModal={setShowQuickBuyModal}
        fetchPoll={fetchPoll}
        ViewerVideo={ViewerVideo}
      />

      {/* Floating Elements & Modals */}
      <ViewerFloatingElements
        stream={stream}
        streamId={streamId}
        streamEnded={streamEnded}
        currentUser={currentUser}
        userBalance={userBalance}
        floatingGifts={floatingGifts}
        removeFloatingGift={removeFloatingGift}
        celebratingGoal={celebratingGoal}
        completedGoalsQueue={completedGoalsQueue}
        ticketedAnnouncement={ticketedAnnouncement}
        showTicketPurchaseSuccess={showTicketPurchaseSuccess}
        upcomingTicketedShow={upcomingTicketedShow}
        dismissedTicketedStream={dismissedTicketedStream}
        hasPurchasedUpcomingTicket={hasPurchasedUpcomingTicket}
        ticketCountdown={ticketCountdown}
        quickBuyLoading={quickBuyLoading}
        showQuickBuyModal={showQuickBuyModal}
        quickBuyInfo={quickBuyInfo}
        showTipModal={showTipModal}
        showMenuModal={showMenuModal}
        showBuyCoinsModal={showBuyCoinsModal}
        menuEnabled={menuEnabled}
        menuItems={menuItems}
        digitalDownload={digitalDownload}
        handleTip={handleTip}
        handleQuickBuyTicket={handleQuickBuyTicket}
        loadCurrentUser={loadCurrentUser}
        onSetShowTipModal={setShowTipModal}
        onSetShowMenuModal={setShowMenuModal}
        onSetShowBuyCoinsModal={setShowBuyCoinsModal}
        onSetDigitalDownload={setDigitalDownload}
        onSetTicketedAnnouncement={setTicketedAnnouncement}
        onSetDismissedTicketedStream={setDismissedTicketedStream}
        onSetShowQuickBuyModal={setShowQuickBuyModal}
        onSetQuickBuyInfo={setQuickBuyInfo}
      />
    </div>
  );
}
