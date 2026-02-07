'use client';

import { RefreshCw, X } from 'lucide-react';

interface ReconnectionOverlayProps {
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  onReconnect: () => void;
}

/**
 * Overlay shown when the broadcaster's LiveKit connection is reconnecting or lost.
 * Only renders when status is 'reconnecting' or 'disconnected'.
 */
export function ReconnectionOverlay({ connectionStatus, onReconnect }: ReconnectionOverlayProps) {
  if (connectionStatus !== 'reconnecting' && connectionStatus !== 'disconnected') {
    return null;
  }

  return (
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
            onClick={onReconnect}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-full transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reconnect
          </button>
        </>
      )}
    </div>
  );
}
