'use client';

import { useEffect } from 'react';

interface UseBRBDetectionOptions {
  streamId: string;
  isLive: boolean;
  streamEnded: boolean;
  onBRBChange: (isBRB: boolean) => void;
  onStreamAutoEnd: () => void;
  intervalMs?: number;
}

/**
 * Polls the heartbeat endpoint to detect when the broadcaster disconnects (BRB state)
 * or when the stream should auto-end due to exceeding the grace period.
 */
export function useBRBDetection({
  streamId,
  isLive,
  streamEnded,
  onBRBChange,
  onStreamAutoEnd,
  intervalMs = 30000,
}: UseBRBDetectionOptions) {
  useEffect(() => {
    if (!isLive || streamEnded) return;

    const checkHeartbeat = async () => {
      try {
        const res = await fetch(`/api/streams/${streamId}/heartbeat`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.shouldAutoEnd) {
          onBRBChange(false);
          onStreamAutoEnd();
          fetch(`/api/streams/${streamId}/auto-end`, { method: 'POST' }).catch(() => {});
        } else if (data.isBRB) {
          onBRBChange(true);
        } else {
          onBRBChange(false);
        }
      } catch (e) {
        console.error('[Stream] Failed to check heartbeat:', e);
      }
    };

    const interval = setInterval(checkHeartbeat, intervalMs);
    checkHeartbeat();

    return () => clearInterval(interval);
  }, [streamId, isLive, streamEnded, intervalMs]);
}
