'use client';

import { useEffect } from 'react';

interface UseStreamHeartbeatOptions {
  streamId: string;
  isLive: boolean;
  intervalMs?: number;
}

/**
 * Sends periodic heartbeat requests to keep a broadcast stream alive.
 * Heartbeats are sent immediately on mount and then at the configured interval.
 */
export function useStreamHeartbeat({ streamId, isLive, intervalMs = 30000 }: UseStreamHeartbeatOptions) {
  useEffect(() => {
    if (!isLive) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/streams/${streamId}/heartbeat`, { method: 'POST' });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, intervalMs);

    return () => clearInterval(interval);
  }, [streamId, isLive, intervalMs]);
}
