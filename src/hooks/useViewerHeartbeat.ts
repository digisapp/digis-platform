'use client';

import { useEffect } from 'react';

interface UseViewerHeartbeatOptions {
  streamId: string;
  isLive: boolean;
  streamEnded: boolean;
  isAuthenticated: boolean;
  onViewerCount?: (currentViewers: number, peakViewers: number) => void;
  intervalMs?: number;
}

/**
 * Sends periodic viewer heartbeats to keep the viewer active and update viewer counts.
 */
export function useViewerHeartbeat({
  streamId,
  isLive,
  streamEnded,
  isAuthenticated,
  onViewerCount,
  intervalMs = 30000,
}: UseViewerHeartbeatOptions) {
  useEffect(() => {
    if (!isLive || streamEnded || !isAuthenticated) return;

    const sendViewerHeartbeat = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/viewer-heartbeat`, {
          method: 'POST',
        });
        if (res.ok) {
          const data = await res.json();
          onViewerCount?.(data.currentViewers, data.peakViewers);
        }
      } catch (e) {
        console.error('[Stream] Viewer heartbeat failed:', e);
      }
    };

    const interval = setInterval(sendViewerHeartbeat, intervalMs);
    sendViewerHeartbeat();

    return () => clearInterval(interval);
  }, [streamId, isLive, streamEnded, isAuthenticated, intervalMs]);
}
