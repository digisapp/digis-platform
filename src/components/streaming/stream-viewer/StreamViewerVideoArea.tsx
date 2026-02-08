'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { StreamPoll } from '@/components/streaming/StreamPoll';
import { StreamCountdown } from '@/components/streaming/StreamCountdown';
import { GuestVideoOverlay } from '@/components/streaming/GuestVideoOverlay';
import { ConnectionStatusBanner } from '@/components/streaming/ConnectionStatusBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StreamErrorBoundary } from '@/components/error-boundaries';
import {
  Volume2, VolumeX, Maximize, Minimize, Share2,
  MessageCircle, Gift, Eye, Star, Coins, Video
} from 'lucide-react';
import type { StreamGoal } from '@/db/schema';
import type { ConnectionState } from '@/hooks/useStreamChat';
import type { StreamWithCreator, FeaturedCreator, ActivePoll, ActiveCountdown, ActiveGuest, CreatorCallSettings } from './types';

function BroadcasterVideo() {
  const participants = useRemoteParticipants();

  const broadcasterWithScreenShare = participants.find(p => {
    const screenTrack = p.getTrackPublication(Track.Source.ScreenShare);
    return screenTrack?.track;
  });

  const broadcasterWithCamera = participants.find(p => {
    const cameraTrack = p.getTrackPublication(Track.Source.Camera);
    return cameraTrack?.track;
  });

  const broadcaster = broadcasterWithScreenShare || broadcasterWithCamera;

  if (!broadcaster) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white/60">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  const screenShareTrack = broadcaster.getTrackPublication(Track.Source.ScreenShare);
  if (screenShareTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: broadcaster, source: Track.Source.ScreenShare, publication: screenShareTrack }}
        className="h-full w-full object-contain"
      />
    );
  }

  const cameraTrack = broadcaster.getTrackPublication(Track.Source.Camera);
  if (cameraTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: broadcaster, source: Track.Source.Camera, publication: cameraTrack }}
        className="h-full w-full object-contain"
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white/60">Waiting for broadcaster...</p>
      </div>
    </div>
  );
}

interface StreamViewerVideoAreaProps {
  stream: StreamWithCreator;
  streamId: string;
  token: string;
  serverUrl: string;
  connectionState: ConnectionState;
  showControls: boolean;
  setShowControls: (v: boolean) => void;
  showChat: boolean;
  setShowChat: (v: boolean) => void;
  isMobile: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  viewerCount: number;
  streamEnded: boolean;
  goals: StreamGoal[];
  activePoll: ActivePoll | null;
  activeCountdown: ActiveCountdown | null;
  activeGuest: ActiveGuest | null;
  spotlightedCreator: FeaturedCreator | null;
  creatorCallSettings: CreatorCallSettings | null;
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  onFollowToggle: () => void;
  onShareStream: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onShowGiftPanel: () => void;
  onShowCallModal: () => void;
  onPollEnded: () => void;
  onPollVoted: () => void;
  onCountdownEnded: () => void;
}

export function StreamViewerVideoArea({
  stream, streamId, token, serverUrl, connectionState,
  showControls, setShowControls, showChat, setShowChat,
  isMobile, isMuted, isFullscreen, isFollowing, followLoading,
  viewerCount, streamEnded, goals, activePoll, activeCountdown,
  activeGuest, spotlightedCreator, creatorCallSettings,
  videoContainerRef, onFollowToggle, onShareStream, onToggleMute,
  onToggleFullscreen, onShowGiftPanel, onShowCallModal,
  onPollEnded, onPollVoted, onCountdownEnded,
}: StreamViewerVideoAreaProps) {
  const router = useRouter();

  return (
    <div
      ref={videoContainerRef as React.RefObject<HTMLDivElement>}
      className="relative flex-1 bg-black flex items-center justify-center"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={() => isMobile && setShowControls(!showControls)}
    >
      <ConnectionStatusBanner connectionState={connectionState} />

      {token && serverUrl ? (
        <StreamErrorBoundary streamId={streamId} creatorName={stream?.creator?.displayName || stream?.creator?.username || undefined} onLeave={() => window.location.href = '/'}>
          <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={serverUrl}
            className="h-full w-full flex items-center justify-center"
            options={{ adaptiveStream: true, dynacast: true }}
          >
            <BroadcasterVideo />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </StreamErrorBoundary>
      ) : (
        <div className="h-full flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Top Gradient */}
      <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 flex items-start justify-between transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="lg:hidden flex-shrink-0">
            <Image src="/logo.png" alt="Digis" width={32} height={32} className="w-8 h-8" />
          </button>
          <button onClick={() => router.push(`/${stream.creator?.username}`)} className="relative group">
            {stream.creator?.avatarUrl ? (
              <Image src={stream.creator.avatarUrl} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500 ring-offset-2 ring-offset-black" unoptimized />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold ring-2 ring-red-500 ring-offset-2 ring-offset-black">
                {stream.creator?.username?.[0] || '?'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-black animate-pulse" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{stream.creator?.username}</span>
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-md animate-pulse">LIVE</span>
            </div>
            <button
              onClick={onFollowToggle}
              disabled={followLoading}
              className={`mt-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isFollowing ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-digis-pink text-white hover:scale-105'
              }`}
            >
              {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-full" aria-live="polite">
            <Eye className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold">{viewerCount.toLocaleString()}</span>
          </div>
          <button onClick={onShareStream} className="p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors" aria-label="Share stream">
            <Share2 className="w-5 h-5" />
          </button>
          {!isMobile && (
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-full transition-colors ${showChat ? 'bg-digis-cyan text-black' : 'bg-black/60 backdrop-blur-sm hover:bg-white/20'}`}
              aria-label="Toggle chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Goal Bar */}
      {goals.length > 0 && goals.some(g => g.isActive && !g.isCompleted) && (
        <div className="absolute bottom-24 md:bottom-auto md:top-20 left-4 right-4 z-30">
          {goals.filter(g => g.isActive && !g.isCompleted).slice(0, 1).map(goal => {
            const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isAlmostComplete = progress >= 80;
            const isHalfway = progress >= 50;

            return (
              <div
                key={goal.id}
                className={`relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isAlmostComplete
                    ? 'border-yellow-400/50 bg-gradient-to-r from-yellow-900/40 via-orange-900/40 to-yellow-900/40'
                    : 'border-cyan-500/30 bg-gradient-to-r from-black/80 via-cyan-950/40 to-black/80'
                }`}
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className={`absolute inset-0 opacity-30 ${isAlmostComplete ? 'bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent'}`}
                    style={{ animation: 'shimmer 2s infinite', transform: 'translateX(-100%)' }}
                  />
                </div>
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${
                        isAlmostComplete
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30'
                          : 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/30'
                      }`}>
                        <span className="text-xl">{isAlmostComplete ? '🔥' : '🎯'}</span>
                        {isAlmostComplete && <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl blur opacity-50 animate-pulse" />}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm md:text-base">{goal.title}</h3>
                        {goal.rewardText && (
                          <p className="text-xs text-gray-400 flex items-center gap-1"><span>🎁</span> {goal.rewardText}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg md:text-xl font-black ${isAlmostComplete ? 'text-yellow-400' : 'text-cyan-400'}`}>
                        {goal.currentAmount.toLocaleString()}
                        <span className="text-white/60 text-sm font-medium">/{goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className={`text-xs font-bold ${isAlmostComplete ? 'text-yellow-300' : 'text-cyan-300'}`}>
                        {progress.toFixed(0)}% Complete
                      </div>
                    </div>
                  </div>
                  <div className="relative h-4 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)' }} />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                        isAlmostComplete ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-400' : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
                      <div className={`absolute right-0 top-0 bottom-0 w-8 ${isAlmostComplete ? 'bg-gradient-to-r from-transparent to-yellow-300/50' : 'bg-gradient-to-r from-transparent to-cyan-300/50'} animate-pulse`} />
                    </div>
                    <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
                      {[25, 50, 75].map(milestone => (
                        <div key={milestone} className={`w-0.5 h-2 rounded-full transition-colors ${progress >= milestone ? 'bg-white/60' : 'bg-white/20'}`} style={{ marginLeft: `${milestone - 1}%` }} />
                      ))}
                    </div>
                  </div>
                  {isAlmostComplete && (
                    <div className="mt-2 text-center"><span className="text-xs text-yellow-300 font-bold animate-pulse">Almost there! Keep going! 🚀</span></div>
                  )}
                  {isHalfway && !isAlmostComplete && (
                    <div className="mt-2 text-center"><span className="text-xs text-cyan-300 font-medium">Halfway there! 💪</span></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Username Watermark */}
      {!streamEnded && stream?.creator?.username && (
        <div className="absolute bottom-16 sm:bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <span
            className="text-lg sm:text-xl font-semibold tracking-wide whitespace-nowrap font-[family-name:var(--font-poppins)]"
            style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)', letterSpacing: '0.02em' }}
          >
            digis.cc/{stream.creator.username}
          </span>
        </div>
      )}

      {/* Guest Video Overlay */}
      {activeGuest && (
        <GuestVideoOverlay
          guestUserId={activeGuest.userId}
          guestUsername={activeGuest.username}
          guestDisplayName={activeGuest.displayName}
          guestAvatarUrl={activeGuest.avatarUrl}
          requestType={activeGuest.requestType}
          isHost={false}
        />
      )}

      {/* Spotlight Card - Desktop */}
      {spotlightedCreator && !isMobile && (
        <div className="absolute bottom-28 left-4 z-40 animate-in slide-in-from-left duration-500">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse" />
            <div className="relative">
              {spotlightedCreator.avatarUrl ? (
                <img src={spotlightedCreator.avatarUrl} alt={spotlightedCreator.username} className="w-14 h-14 rounded-full object-cover ring-4 ring-yellow-500 shadow-lg" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center ring-4 ring-yellow-500">
                  <span className="text-2xl font-bold text-white">{spotlightedCreator.username?.[0]?.toUpperCase() || '?'}</span>
                </div>
              )}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Star className="w-4 h-4 text-black fill-black" />
              </div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">✨ Now Featured</span></div>
              <h3 className="font-bold text-white text-lg">{spotlightedCreator.username}</h3>
              <p className="text-sm text-gray-300">@{spotlightedCreator.username}</p>
            </div>
            <button onClick={onShowGiftPanel} className="relative ml-2 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-bold text-black hover:scale-105 transition-transform shadow-lg shadow-yellow-500/30">
              <Coins className="w-5 h-5" /><span>Gift</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Poll */}
      {activePoll && activePoll.isActive && (
        <div className="absolute bottom-20 left-3 z-40 w-[220px] sm:w-[260px]">
          <StreamPoll poll={activePoll} isBroadcaster={false} streamId={streamId} onPollEnded={onPollEnded} onVoted={onPollVoted} />
        </div>
      )}

      {/* Active Countdown */}
      {activeCountdown && activeCountdown.isActive && (
        <div className="absolute bottom-20 right-3 z-40 w-[180px]">
          <StreamCountdown countdown={activeCountdown} isBroadcaster={false} streamId={streamId} onCountdownEnded={onCountdownEnded} />
        </div>
      )}

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-lg md:text-xl font-bold text-white mb-3 line-clamp-1">{stream.title}</h1>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={onToggleMute} className="p-3 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors" aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onShowGiftPanel} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-digis-pink to-digis-purple rounded-full font-bold text-sm hover:scale-105 transition-transform">
              <Gift className="w-4 h-4" /><span className="hidden sm:inline">Send Gift</span>
            </button>
            {creatorCallSettings && (creatorCallSettings.isAvailableForCalls || creatorCallSettings.isAvailableForVoiceCalls) && (
              <button onClick={onShowCallModal} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full font-bold text-sm hover:scale-105 transition-transform">
                <Video className="w-4 h-4" /><span className="hidden sm:inline">Call</span>
              </button>
            )}
            <button onClick={onToggleFullscreen} className="p-3 bg-black/60 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors" aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
