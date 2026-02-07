'use client';

import { useEffect, useState } from 'react';

interface UseVipShowParams {
  streamId: string;
  announcedTicketedStream: { id: string; title: string; ticketPrice: number; startsAt: Date } | null;
  vipModeActive: boolean;
  setVipModeActive: (active: boolean) => void;
  setAnnouncedTicketedStream: (val: { id: string; title: string; ticketPrice: number; startsAt: Date } | null) => void;
  setVipTicketCount: (count: number) => void;
  showError: (msg: string) => void;
}

export function useVipShow({
  streamId,
  announcedTicketedStream,
  vipModeActive,
  setVipModeActive,
  setAnnouncedTicketedStream,
  setVipTicketCount,
  showError,
}: UseVipShowParams) {
  const [startingVipStream, setStartingVipStream] = useState(false);
  const [ticketedCountdown, setTicketedCountdown] = useState<string>('');

  // Poll for ticket count when there's an announced ticketed stream
  useEffect(() => {
    if (!announcedTicketedStream || vipModeActive) return;

    const fetchTicketCount = async () => {
      try {
        const res = await fetch(`/api/shows/${announcedTicketedStream.id}`);
        if (res.ok) {
          const data = await res.json();
          setVipTicketCount(data.show?.ticketsSold || 0);
        }
      } catch (e) {
        console.error('[Ticketed] Failed to fetch ticket count:', e);
      }
    };

    fetchTicketCount();
    const interval = setInterval(fetchTicketCount, 30000);

    return () => clearInterval(interval);
  }, [announcedTicketedStream?.id, vipModeActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for announced ticketed stream
  useEffect(() => {
    if (!announcedTicketedStream || vipModeActive) {
      setTicketedCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const startsAt = new Date(announcedTicketedStream.startsAt);
      const diff = startsAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTicketedCountdown('Starting soon');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTicketedCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTicketedCountdown(`${minutes}m ${seconds}s`);
      } else {
        setTicketedCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [announcedTicketedStream, vipModeActive]);

  // Start the VIP ticketed stream immediately
  const handleStartVipStream = async () => {
    if (!announcedTicketedStream || startingVipStream) return;
    setStartingVipStream(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/vip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: announcedTicketedStream.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start VIP stream');
      }

      setVipModeActive(true);
      setStartingVipStream(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to start VIP stream');
      setStartingVipStream(false);
    }
  };

  // End VIP mode and return to free stream
  const handleEndVipStream = async () => {
    if (!vipModeActive) return;

    try {
      const response = await fetch(`/api/streams/${streamId}/vip`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end VIP stream');
      }

      setVipModeActive(false);
      setAnnouncedTicketedStream(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to end VIP stream');
    }
  };

  return {
    ticketedCountdown,
    startingVipStream,
    handleStartVipStream,
    handleEndVipStream,
  };
}
