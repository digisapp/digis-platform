'use client';

import { useEffect } from 'react';

interface UseStreamAutoEndOptions {
  streamId: string;
  isLive: boolean;
  hasManuallyEnded: boolean;
}

/**
 * Handles auto-ending a broadcast stream when the page unloads or
 * the component unmounts. Uses sendBeacon for reliable delivery.
 */
export function useStreamAutoEnd({ streamId, isLive, hasManuallyEnded }: UseStreamAutoEndOptions) {
  useEffect(() => {
    if (!isLive) return;

    let hasCleanedUp = false;

    const endStreamCleanup = () => {
      if (hasManuallyEnded || hasCleanedUp) return;
      hasCleanedUp = true;

      const url = `/api/streams/${streamId}/end`;
      const success = navigator.sendBeacon(url);
      if (!success) {
        fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      endStreamCleanup();
      e.preventDefault();
      return '';
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[Broadcast] Tab hidden, heartbeat will keep stream alive');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      endStreamCleanup();
    };
  }, [streamId, isLive, hasManuallyEnded]);
}
