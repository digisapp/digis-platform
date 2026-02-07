'use client';

import { useEffect } from 'react';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface UseConnectionTimeoutOptions {
  status: ConnectionStatus;
  setStatus: (updater: (prev: ConnectionStatus) => ConnectionStatus) => void;
  timeoutMs?: number;
}

/**
 * Provides a safety timeout for LiveKit connections.
 * If the connection is still in 'connecting' state after the timeout,
 * it transitions to 'disconnected'.
 */
export function useConnectionTimeout({ status, setStatus, timeoutMs = 30000 }: UseConnectionTimeoutOptions) {
  useEffect(() => {
    if (status !== 'connecting') return;
    const timeout = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'connecting') {
          console.warn('[LiveKit] Initial connection timed out after 30s');
          return 'disconnected';
        }
        return prev;
      });
    }, timeoutMs);
    return () => clearTimeout(timeout);
  }, [status, setStatus, timeoutMs]);
}
