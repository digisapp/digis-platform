'use client';

import { memo } from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { VideoPresets } from 'livekit-client';
import { StreamErrorBoundary } from '@/components/error-boundaries';
import { ViewerList } from '@/components/streaming/ViewerList';
import { StreamHealthIndicator } from '@/components/streaming/StreamHealthIndicator';
import { MobileToolsPanel } from '@/components/streaming/MobileToolsPanel';
import { StreamRecordButton } from '@/components/streaming/StreamRecordButton';
import { StreamClipButton } from '@/components/streaming/StreamClipButton';
import { StreamPoll } from '@/components/streaming/StreamPoll';
import { StreamCountdown } from '@/components/streaming/StreamCountdown';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { GuestVideoOverlay } from '@/components/streaming/GuestVideoOverlay';
import {
  LocalCameraPreview,
  ScreenShareControl,
  CameraFlipControl,
  ReconnectionOverlay,
  VipShowIndicator,
} from '@/components/streaming/broadcast';
import { BeautyFilterToggle } from '@/components/beauty-filter/BeautyFilterToggle';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Coins, Target, Ticket, List, BarChart2, Clock, Smartphone, Monitor } from 'lucide-react';
import type { StreamGoal } from '@/db/schema';
import type { StreamRecording } from '@/hooks/useStreamRecorder';

interface ActiveGuest {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestType: 'video' | 'voice';
}

interface BroadcasterVideoAreaProps {
  streamId: string;
  token: string;
  serverUrl: string;
  streamOrientation: 'landscape' | 'portrait';
  isLandscape: boolean;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  setConnectionStatus: React.Dispatch<React.SetStateAction<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>>;
  facingMode: 'user' | 'environment';
  setFacingMode: React.Dispatch<React.SetStateAction<'user' | 'environment'>>;
  isScreenSharing: boolean;
  setIsScreenSharing: React.Dispatch<React.SetStateAction<boolean>>;
  preferredVideoDevice: string | undefined;
  preferredAudioDevice: string | undefined;
  // Top-left indicators
  formatDuration: () => string;
  viewerCount: number;
  totalEarnings: number;
  activeGuest: ActiveGuest | null;
  setActiveGuest: React.Dispatch<React.SetStateAction<ActiveGuest | null>>;
  // Recording & Clips
  isRecording: boolean;
  formattedDuration: string;
  maxDuration: number;
  recordings: StreamRecording[];
  maxRecordings: number;
  startRecording: () => void;
  stopRecording: () => void;
  clipIsSupported: boolean;
  canClip: boolean;
  clipIsClipping: boolean;
  clipBufferSeconds: number;
  clipCooldownRemaining: number;
  handleCreateClip: () => Promise<void>;
  // Goals
  goals: StreamGoal[];
  setEditingGoal: React.Dispatch<React.SetStateAction<StreamGoal | null>>;
  setShowGoalModal: React.Dispatch<React.SetStateAction<boolean>>;
  // Polls & Countdown
  activePoll: { id: string; question: string; options: string[]; voteCounts: number[]; totalVotes: number; endsAt: string; isActive: boolean } | null;
  setActivePoll: React.Dispatch<React.SetStateAction<{ id: string; question: string; options: string[]; voteCounts: number[]; totalVotes: number; endsAt: string; isActive: boolean } | null>>;
  activeCountdown: { id: string; label: string; endsAt: string; isActive: boolean } | null;
  setActiveCountdown: React.Dispatch<React.SetStateAction<{ id: string; label: string; endsAt: string; isActive: boolean } | null>>;
  setShowCreatePollModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCreateCountdownModal: React.Dispatch<React.SetStateAction<boolean>>;
  fetchPoll: () => Promise<void>;
  // VIP
  announcedTicketedStream: { id: string; title: string; ticketPrice: number; startsAt: Date } | null;
  vipModeActive: boolean;
  ticketedCountdown: string | null;
  vipTicketCount: number;
  startingVipStream: boolean;
  handleStartVipStream: () => Promise<void>;
  handleEndVipStream: () => Promise<void>;
  setShowAnnounceModal: React.Dispatch<React.SetStateAction<boolean>>;
  // Menu
  handleToggleMenu: () => Promise<void>;
  menuEnabled: boolean;
  // End stream
  isRecordingActive: boolean;
  setIsLeaveAttempt: React.Dispatch<React.SetStateAction<boolean>>;
  setShowEndConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  // QR
  setShowQRCode: React.Dispatch<React.SetStateAction<boolean>>;
  // Mobile tools
  showMobileTools: boolean;
  setShowMobileTools: React.Dispatch<React.SetStateAction<boolean>>;
  // Watermark
  currentUsername: string | null;
  showStreamSummary: boolean;
  showSaveRecordingsModal: boolean;
  showEndConfirm: boolean;
  // Error retry
  setError: React.Dispatch<React.SetStateAction<string>>;
  fetchBroadcastToken: () => Promise<void>;
  // Router
  onLeave: () => void;
}

export const BroadcasterVideoArea = memo(function BroadcasterVideoArea({
  streamId,
  token,
  serverUrl,
  streamOrientation,
  isLandscape,
  connectionStatus,
  setConnectionStatus,
  facingMode,
  setFacingMode,
  isScreenSharing,
  setIsScreenSharing,
  preferredVideoDevice,
  preferredAudioDevice,
  formatDuration,
  viewerCount,
  totalEarnings,
  activeGuest,
  setActiveGuest,
  isRecording,
  formattedDuration,
  maxDuration,
  recordings,
  maxRecordings,
  startRecording,
  stopRecording,
  clipIsSupported,
  canClip,
  clipIsClipping,
  clipBufferSeconds,
  clipCooldownRemaining,
  handleCreateClip,
  goals,
  setEditingGoal,
  setShowGoalModal,
  activePoll,
  setActivePoll,
  activeCountdown,
  setActiveCountdown,
  setShowCreatePollModal,
  setShowCreateCountdownModal,
  fetchPoll,
  announcedTicketedStream,
  vipModeActive,
  ticketedCountdown,
  vipTicketCount,
  startingVipStream,
  handleStartVipStream,
  handleEndVipStream,
  setShowAnnounceModal,
  handleToggleMenu,
  menuEnabled,
  isRecordingActive,
  setIsLeaveAttempt,
  setShowEndConfirm,
  setShowQRCode,
  showMobileTools,
  setShowMobileTools,
  currentUsername,
  showStreamSummary,
  showSaveRecordingsModal,
  showEndConfirm,
  setError,
  fetchBroadcastToken,
  onLeave,
}: BroadcasterVideoAreaProps) {
  return (
    <div className={`${streamOrientation === 'portrait' ? 'lg:col-span-1 max-w-md mx-auto' : 'lg:col-span-2'} space-y-4`}>
      {/* Video Player */}
      <div
        className={`bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative ${
          streamOrientation === 'portrait'
            ? isLandscape
              ? 'h-[calc(100dvh-120px)] w-auto mx-auto aspect-[9/16]'
              : 'aspect-[9/16] max-h-[80dvh] sm:max-h-[70dvh]'
            : 'aspect-video'
        }`}
        data-lk-video-container
      >
        {token && serverUrl ? (
          <>
            <StreamErrorBoundary streamId={streamId} onLeave={onLeave}>
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
                  deviceId: preferredVideoDevice,
                },
                audioCaptureDefaults: {
                  deviceId: preferredAudioDevice,
                },
                publishDefaults: {
                  videoSimulcastLayers: [
                    VideoPresets.h1440,
                    VideoPresets.h1080,
                    VideoPresets.h720,
                  ],
                  videoEncoding: {
                    maxBitrate: 10_000_000,
                    maxFramerate: 30,
                    priority: 'high',
                  },
                  screenShareEncoding: {
                    maxBitrate: 12_000_000,
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
                  if (prev === 'connected') return 'reconnecting';
                  return prev;
                });
              }}
              onError={(error) => {
                console.error('[LiveKit] Room error:', error);
                setConnectionStatus(prev => {
                  if (prev === 'connecting') {
                    console.log('[LiveKit] Error during initial connection, staying in connecting state');
                    return prev;
                  }
                  return 'disconnected';
                });
              }}
            >
              <ReconnectionOverlay
                connectionStatus={connectionStatus}
                onReconnect={() => {
                  setConnectionStatus('connecting');
                  window.location.reload();
                }}
              />
              <LocalCameraPreview isMirrored={facingMode === 'user'} />
              <RoomAudioRenderer />
              <div className="absolute bottom-3 right-3 z-20 hidden md:flex items-center gap-2">
                <BeautyFilterToggle variant="toolbar" />
                <ScreenShareControl
                  isScreenSharing={isScreenSharing}
                  onScreenShareChange={setIsScreenSharing}
                />
              </div>
              <div className="absolute top-3 right-3 z-30 md:hidden flex items-center gap-2">
                <BeautyFilterToggle variant="toolbar" />
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
              <div className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-white font-semibold text-sm">{formatDuration()}</span>
              </div>

              <ViewerList streamId={streamId} currentViewers={viewerCount} activeGuestId={activeGuest?.userId} />

              <div className="flex items-center gap-1.5 px-3 py-2 backdrop-blur-xl bg-black/60 rounded-full border border-yellow-500/30">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm">{totalEarnings.toLocaleString()}</span>
              </div>

              <StreamHealthIndicator streamId={streamId} />

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

                <button
                  onClick={() => {
                    if (isRecordingActive) {
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

            {/* Top Right Overlay - Desktop buttons */}
            <div className="absolute top-3 right-3 z-10">
              <div className="hidden md:flex items-center gap-2">
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

                {!announcedTicketedStream && (
                  <button
                    onClick={() => setShowAnnounceModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl bg-black/60 rounded-full border border-amber-500/30 text-white font-semibold text-sm hover:border-amber-500/60 hover:bg-black/80 transition-all"
                  >
                    <Ticket className="w-4 h-4 text-amber-400" />
                    <span className="text-sm">VIP</span>
                  </button>
                )}

                <div className="w-px h-6 bg-white/20" />

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

                <button
                  onClick={() => setShowQRCode(true)}
                  className="p-2 backdrop-blur-xl bg-black/60 rounded-full border border-green-500/30 text-white hover:border-green-500/60 hover:bg-black/80 transition-all"
                  title="Remote Control"
                >
                  <Smartphone className="w-4 h-4 text-green-400" />
                </button>
              </div>
            </div>

            {/* Mobile Bottom Tools */}
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

            {/* VIP Show Indicator */}
            {announcedTicketedStream && (
              <div className="absolute top-52 md:top-auto md:bottom-14 left-3 z-20">
                <VipShowIndicator
                  announcedTicketedStream={announcedTicketedStream}
                  vipModeActive={vipModeActive}
                  ticketedCountdown={ticketedCountdown || ''}
                  vipTicketCount={vipTicketCount}
                  startingVipStream={startingVipStream}
                  onStartVip={handleStartVipStream}
                  onEndVip={handleEndVipStream}
                />
              </div>
            )}

            {/* Desktop Record + Clip + End Stream Buttons */}
            <div className="absolute bottom-3 left-3 z-20 hidden md:flex flex-row items-center gap-2">
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
                />
              )}

              <button
                onClick={() => {
                  if (isRecordingActive) {
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

            {/* Username Watermark */}
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

            <SpotlightedCreatorOverlay streamId={streamId} isHost={true} />

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
  );
});
