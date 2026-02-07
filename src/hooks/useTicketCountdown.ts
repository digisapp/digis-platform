'use client';

import { useState, useEffect } from 'react';

/**
 * Countdown timer for ticketed streams. Updates every second.
 * Returns formatted countdown string (e.g., "2h 30m", "5m 12s", "Starting...").
 */
export function useTicketCountdown(startsAt: string | null | undefined): string {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!startsAt) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const startTime = new Date(startsAt).getTime();
      const diff = startTime - now;

      if (diff <= 0) {
        setCountdown('Starting...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [startsAt]);

  return countdown;
}
