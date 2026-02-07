'use client';

import { Volume2, VolumeX, Share2, X, Users, Scissors } from 'lucide-react';

interface StreamHeaderBarProps {
  creator: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  viewerCount: number;
  muted: boolean;
  showChat: boolean;
  streamEnded: boolean;
  clipIsSupported: boolean;
  canClip: boolean;
  clipIsClipping: boolean;
  clipBufferSeconds: number;
  clipCooldownRemaining: number;
  onBack: () => void;
  onToggleMute: () => void;
  onShare: () => void;
  onCreateClip: () => void;
  onToggleChat: () => void;
}

export function StreamHeaderBar({
  creator,
  viewerCount,
  muted,
  showChat,
  streamEnded,
  clipIsSupported,
  canClip,
  clipIsClipping,
  clipBufferSeconds,
  clipCooldownRemaining,
  onBack,
  onToggleMute,
  onShare,
  onCreateClip,
  onToggleChat,
}: StreamHeaderBarProps) {
  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 glass-dark border-b border-cyan-400/20 backdrop-blur-xl shadow-[0_0_15px_rgba(34,211,238,0.1)]">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <button
          onClick={onBack}
          className="hidden lg:block p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Creator Info - compact on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.displayName || creator.username}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center font-bold text-sm flex-shrink-0">
              {creator.displayName?.[0] || creator.username?.[0] || '?'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-bold text-sm sm:text-base truncate">
                {creator.displayName || creator.username}
              </span>
              {creator.isVerified && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="text-xs text-white/60">
              {viewerCount.toLocaleString()} watching
            </div>
          </div>
        </div>

        {/* Live Badge */}
        <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-red-600 rounded-lg flex-shrink-0">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs sm:text-sm font-bold">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Mute Toggle Button - mobile only */}
        <button
          onClick={onToggleMute}
          className={`lg:hidden p-2.5 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${muted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
          title={muted ? 'Unmute' : 'Mute'}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Share Button */}
        <button
          onClick={onShare}
          className="p-2.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Share"
          aria-label="Share stream"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Clip Button - viewers can clip the last 30 seconds */}
        {clipIsSupported && !streamEnded && (
          <button
            onClick={onCreateClip}
            disabled={!canClip || clipIsClipping}
            className={`p-2.5 sm:p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              clipIsClipping
                ? 'bg-green-500/20 text-green-400 animate-pulse'
                : clipCooldownRemaining > 0
                  ? 'text-gray-600 cursor-not-allowed'
                  : canClip
                    ? 'hover:bg-green-500/20 text-green-400'
                    : 'text-gray-600'
            }`}
            title={
              clipIsClipping ? 'Creating clip...'
                : clipCooldownRemaining > 0 ? `Wait ${clipCooldownRemaining}s`
                  : canClip ? `Clip last ${clipBufferSeconds}s`
                    : 'Buffering...'
            }
            aria-label={
              clipIsClipping ? 'Creating clip...'
                : clipCooldownRemaining > 0 ? `Clip cooldown: ${clipCooldownRemaining} seconds`
                  : canClip ? `Clip last ${clipBufferSeconds} seconds`
                    : 'Clip not available'
            }
          >
            {clipCooldownRemaining > 0 ? (
              <span className="text-xs font-bold tabular-nums">{clipCooldownRemaining}s</span>
            ) : (
              <Scissors className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Toggle Chat Button - desktop only since chat is always visible below video on mobile */}
        <button
          onClick={onToggleChat}
          className={`hidden sm:flex p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] items-center justify-center ${showChat ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10'}`}
          title={showChat ? 'Hide Chat' : 'Show Chat'}
          aria-label={showChat ? 'Hide chat panel' : 'Show chat panel'}
        >
          <Users className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
