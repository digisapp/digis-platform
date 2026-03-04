'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X, LogOut } from 'lucide-react';

interface ReconnectionOverlayProps {
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  onReconnect: () => void;
  onEndStream?: () => void;
}

/**
 * Overlay shown when the broadcaster's LiveKit connection is reconnecting or lost.
 * Only renders when status is 'reconnecting' or 'disconnected'.
 */
export function ReconnectionOverlay({ connectionStatus, onReconnect, onEndStream }: ReconnectionOverlayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (connectionStatus !== 'reconnecting' && connectionStatus !== 'disconnected') {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [connectionStatus]);

  if (connectionStatus !== 'reconnecting' && connectionStatus !== 'disconnected') {
    return null;
  }

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
      {connectionStatus === 'reconnecting' ? (
        <>
          <div className="w-16 h-16 mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
          <p className="text-white text-lg font-semibold mb-2">Reconnecting...</p>
          <p className="text-white/60 text-sm">Please wait while we restore your connection</p>
          <p className="text-white/40 text-xs mt-3 tabular-nums">Attempting for {formatElapsed(elapsed)}</p>
          {elapsed >= 15 && onEndStream && (
            <button
              onClick={onEndStream}
              className="flex items-center gap-2 px-4 py-2 mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-full transition-colors border border-red-500/30"
            >
              <LogOut className="w-4 h-4" />
              End Stream
            </button>
          )}
        </>
      ) : (
        <>
          <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-white text-lg font-semibold mb-2">Connection Lost</p>
          <p className="text-white/60 text-sm mb-4">Unable to maintain stream connection</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onReconnect}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect
            </button>
            {onEndStream && (
              <button
                onClick={onEndStream}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-full transition-colors border border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                End Stream
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
