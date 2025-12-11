'use client';

import { useState, useEffect } from 'react';
import { Loader2, WifiOff, Clock } from 'lucide-react';

interface BRBOverlayProps {
  streamId: string;
  creatorName?: string;
  isTicketed?: boolean;
  onStreamEnded?: () => void;
}

/**
 * BRB (Be Right Back) Overlay
 * Shows when creator disconnects unexpectedly
 * Polls heartbeat endpoint to check if creator has reconnected
 */
export function BRBOverlay({
  streamId,
  creatorName = 'Creator',
  isTicketed = false,
  onStreamEnded
}: BRBOverlayProps) {
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [remainingGrace, setRemainingGrace] = useState<number | null>(null);
  const gracePeriod = isTicketed ? 600 : 300; // 10 min for ticketed, 5 min for free

  // Increment waiting counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsWaiting(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Poll heartbeat endpoint
  useEffect(() => {
    const checkHeartbeat = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/heartbeat`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.shouldAutoEnd) {
          // Stream should be auto-ended
          onStreamEnded?.();
        } else if (!data.isBRB) {
          // Creator is back! This overlay should be hidden by parent
          // The parent component should be listening for this
        }

        setRemainingGrace(data.remainingGraceSeconds ?? null);
      } catch (e) {
        console.error('[BRBOverlay] Failed to check heartbeat:', e);
      }
    };

    // Check immediately and then every 5 seconds
    checkHeartbeat();
    const interval = setInterval(checkHeartbeat, 5000);

    return () => clearInterval(interval);
  }, [streamId, onStreamEnded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-20 -left-20 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute w-80 h-80 bottom-0 right-0 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative text-center p-8 max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-white/20 animate-pulse">
          <WifiOff className="w-12 h-12 text-cyan-400" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-2">
          Be Right Back
        </h2>

        {/* Subtitle */}
        <p className="text-lg text-gray-300 mb-6">
          {creatorName} is reconnecting...
        </p>

        {/* Waiting indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-gray-400">
            Waiting {formatTime(secondsWaiting)}
          </span>
        </div>

        {/* Grace period countdown */}
        {remainingGrace !== null && remainingGrace > 0 && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-2">
              <Clock className="w-4 h-4" />
              <span>Stream will auto-end in</span>
            </div>
            <div className="text-2xl font-mono font-bold text-cyan-400">
              {formatTime(remainingGrace)}
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-sm text-gray-500 mt-6">
          {isTicketed
            ? "Don't worry - you won't be charged if the stream doesn't resume"
            : "Please wait while the creator reconnects"
          }
        </p>
      </div>
    </div>
  );
}
