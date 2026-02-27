'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { StreamChat } from '@/components/streaming/StreamChat';
import { FeaturedCreatorsPanel } from '@/components/streaming/FeaturedCreatorsPanel';
import {
  TopGiftersLeaderboard,
  BroadcasterVideoArea,
  BroadcasterModals,
  BroadcasterFloatingElements,
} from '@/components/streaming/broadcast';
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
import { useBroadcasterData } from '@/hooks/useBroadcasterData';
import { useVipShow } from '@/hooks/useVipShow';
import { useBroadcasterAblyHandlers } from '@/hooks/useBroadcasterAblyHandlers';
import { useBroadcasterInteractions } from '@/hooks/useBroadcasterInteractions';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Alert } from '@/components/streaming/AlertManager';
import type { StreamGoal } from '@/db/schema';
import { useToastContext } from '@/context/ToastContext';

export default function BroadcastStudioPage() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError, showInfo } = useToastContext();
  const streamId = params.streamId as string;

  const preferredVideoDevice = searchParams.get('video') || undefined;
  const preferredAudioDevice = searchParams.get('audio') || undefined;
  const methodParam = searchParams.get('method');

  // --- Consolidated data hook ---
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

  // Detect stream method from stream data or URL param
  const streamMethod: 'browser' | 'rtmp' = (stream?.streamMethod as 'browser' | 'rtmp') || (methodParam === 'rtmp' ? 'rtmp' : 'browser');

  // --- UI-only state ---
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [hasManuallyEnded, setHasManuallyEnded] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StreamGoal | null>(null);
  const [showStreamSummary, setShowStreamSummary] = useState(false);
  const [showSaveStreamModal, setShowSaveStreamModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [showPrivateTips, setShowPrivateTips] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(true);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showCreateCountdownModal, setShowCreateCountdownModal] = useState(false);
  const [showSaveRecordingsModal, setShowSaveRecordingsModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeGuest, setActiveGuest] = useState<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    requestType: 'video' | 'voice';
  } | null>(null);

  // --- Extracted hooks ---
  const { showEndConfirm, setShowEndConfirm, isLeaveAttempt, setIsLeaveAttempt } = useStreamNavPrevention({
    isLive: !!stream && stream.status === 'live',
    hasManuallyEnded,
  });
  const { celebratingGoal, completedGoalsQueue, addCompletedGoal } = useGoalCelebrations();
  const { isPortraitDevice, isLandscape, isSafari } = useDeviceOrientation();
  const { currentTime, formattedDuration: liveDuration, formatDuration } = useStreamDuration(stream?.startedAt);

  useStreamHeartbeat({ streamId, isLive: !!stream && stream.status === 'live' });
  useStreamAutoEnd({ streamId, isLive: !!stream && stream.status === 'live', hasManuallyEnded });
  useConnectionTimeout({ status: connectionStatus, setStatus: setConnectionStatus });

  const { privateTips, hasNewPrivateTips, setHasNewPrivateTips } = usePrivateTips({
    userId: currentUserId,
    isVisible: showPrivateTips,
  });

  // Watermark config (shared by recorder + clipper)
  const clipWatermark = useMemo(() =>
    currentUsername ? { logoUrl: '/images/digis-logo-white.png', creatorUsername: currentUsername } : undefined,
    [currentUsername]
  );

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
    maxDuration: 1800,
    maxRecordings: 20,
    watermark: clipWatermark,
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

  // VIP show hook
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

  // Stream clipping hook
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

  // --- Ably handlers hook ---
  const { removeFloatingGift } = useBroadcasterAblyHandlers({
    streamId,
    setMessages,
    setTotalEarnings,
    setFloatingGifts,
    setViewerCount,
    setPeakViewers,
    setActivePoll,
    setActiveCountdown,
    setVipModeActive,
    setAnnouncedTicketedStream: (s) => setAnnouncedTicketedStream(s),
    setActiveGuest,
    fetchGoals,
    fetchLeaderboard,
    fetchPoll,
    fetchCountdown,
    addCompletedGoal,
    showSuccess,
  });

  // --- Interactions hook ---
  const {
    handleCreateClip,
    handleSendMessage,
    pinnedMessage,
    handlePinMessage,
    handleToggleMenu,
  } = useBroadcasterInteractions({
    streamId,
    stream,
    messages,
    clipIt,
    clipBufferSeconds,
    setClipIsClipping,
    setMessages,
    menuEnabled,
    setMenuEnabled,
    showSuccess,
    showError,
  });

  // --- Loading / Error states ---
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
      <BroadcasterFloatingElements
        floatingGifts={floatingGifts}
        removeFloatingGift={removeFloatingGift}
        celebratingGoal={celebratingGoal}
        completedGoalsQueue={completedGoalsQueue}
        alerts={alerts}
        setAlerts={setAlerts}
        showPrivateTips={showPrivateTips}
        setShowPrivateTips={setShowPrivateTips}
        privateTips={privateTips}
        hasNewPrivateTips={hasNewPrivateTips}
        setHasNewPrivateTips={setHasNewPrivateTips}
        streamId={streamId}
        goals={goals}
        setGoals={setGoals}
        setEditingGoal={setEditingGoal}
        setShowGoalModal={setShowGoalModal}
      />

      <BroadcasterModals
        streamId={streamId}
        stream={stream}
        showGoalModal={showGoalModal}
        setShowGoalModal={setShowGoalModal}
        editingGoal={editingGoal}
        setEditingGoal={setEditingGoal}
        fetchGoals={fetchGoals}
        showCreatePollModal={showCreatePollModal}
        setShowCreatePollModal={setShowCreatePollModal}
        fetchPoll={fetchPoll}
        showCreateCountdownModal={showCreateCountdownModal}
        setShowCreateCountdownModal={setShowCreateCountdownModal}
        fetchCountdown={fetchCountdown}
        showEndConfirm={showEndConfirm}
        setShowEndConfirm={setShowEndConfirm}
        isLeaveAttempt={isLeaveAttempt}
        isEnding={isEnding}
        handleEndStream={handleEndStream}
        showVipEndChoice={showVipEndChoice}
        setShowVipEndChoice={setShowVipEndChoice}
        announcedTicketedStream={announcedTicketedStream}
        vipTicketCount={vipTicketCount}
        handleEndStreamKeepVip={handleEndStreamKeepVip}
        handleEndStreamCancelVip={handleEndStreamCancelVip}
        showStreamSummary={showStreamSummary}
        streamSummary={streamSummary}
        onSummaryClose={() => router.push('/creator/dashboard')}
        showSaveStreamModal={showSaveStreamModal}
        setShowSaveStreamModal={setShowSaveStreamModal}
        showSuccess={showSuccess}
        showSaveRecordingsModal={showSaveRecordingsModal}
        setShowSaveRecordingsModal={setShowSaveRecordingsModal}
        setShowStreamSummary={setShowStreamSummary}
        recordings={recordings}
        formatRecordingDuration={formatRecordingDuration}
        showAnnounceModal={showAnnounceModal}
        setShowAnnounceModal={setShowAnnounceModal}
        viewerCount={viewerCount}
        setAnnouncedTicketedStream={(s) => setAnnouncedTicketedStream(s)}
        showQRCode={showQRCode}
        setShowQRCode={setShowQRCode}
      />

      <div className={`container mx-auto px-2 sm:px-4 pt-2 md:pt-4 md:pb-6 ${isLandscape ? 'pb-2' : 'pb-[calc(80px+env(safe-area-inset-bottom))]'}`}>
        {/* Stream Title - Desktop */}
        <div className="hidden lg:block mb-4">
          <h1 className="text-xl font-bold text-white truncate">{stream?.title || 'Live Stream'}</h1>
        </div>

        <div className={`grid grid-cols-1 ${streamOrientation === 'portrait' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 sm:gap-6`}>
          <BroadcasterVideoArea
            streamId={streamId}
            token={token}
            serverUrl={serverUrl}
            streamMethod={streamMethod}
            streamOrientation={streamOrientation}
            isLandscape={isLandscape}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            facingMode={facingMode}
            setFacingMode={setFacingMode}
            isScreenSharing={isScreenSharing}
            setIsScreenSharing={setIsScreenSharing}
            preferredVideoDevice={preferredVideoDevice}
            preferredAudioDevice={preferredAudioDevice}
            formatDuration={formatDuration}
            viewerCount={viewerCount}
            totalEarnings={totalEarnings}
            activeGuest={activeGuest}
            setActiveGuest={setActiveGuest}
            isRecording={isRecording}
            formattedDuration={formattedDuration}
            maxDuration={maxDuration}
            recordings={recordings}
            maxRecordings={maxRecordings}
            startRecording={startRecording}
            stopRecording={stopRecording}
            clipIsSupported={clipIsSupported}
            canClip={canClip}
            clipIsClipping={clipIsClipping}
            clipBufferSeconds={clipBufferSeconds}
            clipCooldownRemaining={clipCooldownRemaining}
            handleCreateClip={handleCreateClip}
            goals={goals}
            setEditingGoal={setEditingGoal}
            setShowGoalModal={setShowGoalModal}
            activePoll={activePoll}
            setActivePoll={setActivePoll}
            activeCountdown={activeCountdown}
            setActiveCountdown={setActiveCountdown}
            setShowCreatePollModal={setShowCreatePollModal}
            setShowCreateCountdownModal={setShowCreateCountdownModal}
            fetchPoll={fetchPoll}
            announcedTicketedStream={announcedTicketedStream}
            vipModeActive={vipModeActive}
            ticketedCountdown={ticketedCountdown}
            vipTicketCount={vipTicketCount}
            startingVipStream={startingVipStream}
            handleStartVipStream={handleStartVipStream}
            handleEndVipStream={handleEndVipStream}
            setShowAnnounceModal={setShowAnnounceModal}
            handleToggleMenu={handleToggleMenu}
            menuEnabled={menuEnabled}
            isRecordingActive={isRecording}
            setIsLeaveAttempt={setIsLeaveAttempt}
            setShowEndConfirm={setShowEndConfirm}
            setShowQRCode={setShowQRCode}
            showMobileTools={showMobileTools}
            setShowMobileTools={setShowMobileTools}
            currentUsername={currentUsername}
            showStreamSummary={showStreamSummary}
            showSaveRecordingsModal={showSaveRecordingsModal}
            showEndConfirm={showEndConfirm}
            setError={setError}
            fetchBroadcastToken={fetchBroadcastToken}
            onLeave={() => router.push('/creator/dashboard')}
          />

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
                  setMenuEnabled(false);
                  fetch(`/api/streams/${streamId}/tip-menu`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: false }),
                  }).catch(console.error);
                }}
              />
            </div>

            <div className="hidden lg:block">
              <FeaturedCreatorsPanel streamId={streamId} isHost={true} />
            </div>

            <div className="hidden lg:block">
              <TopGiftersLeaderboard leaderboard={leaderboard} maxHeight="180px" />
            </div>
          </div>
        </div>

        <div className="lg:hidden mt-4">
          <FeaturedCreatorsPanel streamId={streamId} isHost={true} />
        </div>

        <div className="lg:hidden mt-4 mb-8">
          <TopGiftersLeaderboard leaderboard={leaderboard} compact />
        </div>
      </div>
      </div>
    </div>
  );
}
