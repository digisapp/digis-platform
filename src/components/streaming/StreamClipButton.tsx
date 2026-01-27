'use client';

import { Scissors, Loader2 } from 'lucide-react';

interface StreamClipButtonProps {
  canClip: boolean;
  isClipping: boolean;
  bufferSeconds: number;
  cooldownRemaining: number;
  onClip: () => void;
  compact?: boolean;
}

export function StreamClipButton({
  canClip,
  isClipping,
  bufferSeconds,
  cooldownRemaining,
  onClip,
  compact = false,
}: StreamClipButtonProps) {
  // State 1: Currently creating a clip (uploading)
  if (isClipping) {
    return (
      <button
        disabled
        className={`flex items-center backdrop-blur-xl bg-green-500/30 rounded-full border-2 border-green-500 text-white font-semibold animate-pulse ${
          compact ? 'gap-1.5 px-3 py-2 min-h-[40px]' : 'gap-2 px-4 py-3 min-h-[48px]'
        }`}
        aria-label="Creating clip..."
      >
        <Loader2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-green-400 animate-spin`} />
        <span className={`text-green-400 font-bold ${compact ? 'text-xs' : 'text-sm'}`}>Clipping...</span>
      </button>
    );
  }

  // State 2: Cooldown active
  if (cooldownRemaining > 0) {
    if (compact) {
      return (
        <button
          disabled
          className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 backdrop-blur-xl rounded-full border border-white/10 bg-white/5 text-gray-500 cursor-not-allowed"
          title={`Wait ${cooldownRemaining}s`}
          aria-label={`Clip cooldown: ${cooldownRemaining} seconds`}
        >
          <span className="text-xs font-bold tabular-nums">{cooldownRemaining}s</span>
        </button>
      );
    }

    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-3 min-h-[48px] backdrop-blur-xl bg-white/5 rounded-full border border-white/10 text-gray-500 cursor-not-allowed"
        title={`Wait ${cooldownRemaining}s before next clip`}
        aria-label={`Clip cooldown: ${cooldownRemaining} seconds`}
      >
        <Scissors className="w-4 h-4" />
        <span className="text-sm tabular-nums">{cooldownRemaining}s</span>
      </button>
    );
  }

  // State 3: Compact mode (icon only)
  if (compact) {
    return (
      <button
        onClick={onClip}
        disabled={!canClip}
        className={`flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 backdrop-blur-xl rounded-full border transition-all active:scale-95 ${
          canClip
            ? 'bg-white/10 border-white/30 text-white hover:bg-green-500/20 hover:border-green-500/50'
            : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
        }`}
        title={
          bufferSeconds < 1
            ? 'Buffering...'
            : `Clip last ${bufferSeconds}s`
        }
        aria-label={canClip ? `Clip last ${bufferSeconds} seconds` : 'Clip not available'}
      >
        <Scissors className={`w-5 h-5 ${canClip ? 'text-green-400' : 'text-gray-600'}`} />
      </button>
    );
  }

  // State 4: Full button (ready to clip)
  return (
    <button
      onClick={onClip}
      disabled={!canClip}
      className={`flex items-center gap-2 px-4 py-3 min-h-[48px] backdrop-blur-xl rounded-full border font-semibold transition-all active:scale-95 ${
        canClip
          ? 'bg-white/10 border-white/30 text-white hover:bg-green-500/20 hover:border-green-500/50'
          : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
      }`}
      title={
        bufferSeconds < 1
          ? 'Buffering...'
          : `Clip last ${bufferSeconds}s`
      }
      aria-label={canClip ? `Clip last ${bufferSeconds} seconds` : 'Clip not available'}
    >
      <Scissors className={`w-5 h-5 ${canClip ? 'text-green-400' : 'text-gray-600'}`} />
      <span className="text-sm font-medium">Clip</span>
    </button>
  );
}
