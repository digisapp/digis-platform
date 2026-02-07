'use client';

import { useEffect, useState } from 'react';

/**
 * Provides a live-updating formatted stream duration string.
 * Updates every second while the stream is active.
 */
export function useStreamDuration(startedAt: string | Date | null | undefined) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = () => {
    if (!startedAt) return '0:00';
    const start = new Date(startedAt);
    const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    currentTime,
    formattedDuration: formatDuration(),
    formatDuration,
  };
}

/**
 * Formats a duration in seconds to a human-readable string.
 */
export function formatDurationFromSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
