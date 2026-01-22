'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ConnectionState } from '@/hooks/useStreamChat';

interface ConnectionStatusBannerProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
}

export function ConnectionStatusBanner({ connectionState, onRetry }: ConnectionStatusBannerProps) {
  const [visible, setVisible] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (connectionState === 'disconnected' || connectionState === 'reconnecting' || connectionState === 'failed') {
      setVisible(true);
      setWasDisconnected(true);
    } else if (connectionState === 'connected') {
      // Show "reconnected" message briefly if we were disconnected
      if (wasDisconnected) {
        setShowSuccessMessage(true);
        const timer = setTimeout(() => {
          setShowSuccessMessage(false);
          setVisible(false);
          setWasDisconnected(false);
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        setVisible(false);
      }
    }
  }, [connectionState, wasDisconnected]);

  if (!visible && !showSuccessMessage) return null;

  // Success message when reconnected
  if (showSuccessMessage && connectionState === 'connected') {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
        <div className="bg-green-500/90 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Connection restored</span>
        </div>
      </div>
    );
  }

  // Reconnecting state
  if (connectionState === 'reconnecting') {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
        <div className="bg-yellow-500/90 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 text-white animate-spin" />
          <span className="text-sm font-medium text-white">Reconnecting...</span>
        </div>
      </div>
    );
  }

  // Disconnected state
  if (connectionState === 'disconnected') {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
        <div className="bg-orange-500/90 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Connection lost. Reconnecting...</span>
        </div>
      </div>
    );
  }

  // Failed state
  if (connectionState === 'failed') {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
        <div className="bg-red-500/90 backdrop-blur-sm px-4 py-3 flex items-center justify-center gap-3">
          <AlertTriangle className="w-4 h-4 text-white" />
          <span className="text-sm font-medium text-white">Connection failed</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium text-white transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
