import { useState } from 'react';
import { formatDurationFromSeconds } from '@/hooks/useStreamDuration';

interface StreamSummaryData {
  duration: string;
  totalViewers: number;
  peakViewers: number;
  totalEarnings: number;
  topSupporters: Array<{ username: string; totalCoins: number }>;
  ticketStats?: {
    ticketsSold: number;
    ticketRevenue: number;
    ticketBuyers: Array<{ username: string; displayName: string | null; avatarUrl: string | null }>;
  };
  tipMenuStats?: {
    totalTipMenuCoins: number;
    totalPurchases: number;
    items: Array<{
      id: string;
      label: string;
      totalCoins: number;
      purchaseCount: number;
      purchasers: Array<{ username: string; amount: number }>;
    }>;
  };
}

interface UseStreamEndHandlingParams {
  streamId: string;
  announcedTicketedStream: {
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  } | null;
  vipModeActive: boolean;
  peakViewers: number;
  viewerCount: number;
  totalEarnings: number;
  formatDuration: () => string;
  recordings: Array<unknown>;
  showError: (msg: string) => void;
  setToken: (token: string) => void;
  setHasManuallyEnded: (ended: boolean) => void;
  setShowEndConfirm: (show: boolean) => void;
  setShowSaveRecordingsModal: (show: boolean) => void;
  setShowStreamSummary: (show: boolean) => void;
  setAnnouncedTicketedStream: (stream: null) => void;
}

export function useStreamEndHandling({
  streamId,
  announcedTicketedStream,
  vipModeActive,
  peakViewers,
  viewerCount,
  totalEarnings,
  formatDuration,
  recordings,
  showError,
  setToken,
  setHasManuallyEnded,
  setShowEndConfirm,
  setShowSaveRecordingsModal,
  setShowStreamSummary,
  setAnnouncedTicketedStream,
}: UseStreamEndHandlingParams) {
  const [isEnding, setIsEnding] = useState(false);
  const [vipTicketCount, setVipTicketCount] = useState(0);
  const [showVipEndChoice, setShowVipEndChoice] = useState(false);
  const [streamSummary, setStreamSummary] = useState<StreamSummaryData | null>(null);

  const fetchStreamSummary = async () => {
    try {
      const streamResponse = await fetch(`/api/streams/${streamId}`);
      const streamData = await streamResponse.json();

      const leaderboardResponse = await fetch(`/api/streams/${streamId}/leaderboard`);
      const leaderboardData = await leaderboardResponse.json();

      let tipMenuStats: StreamSummaryData['tipMenuStats'];
      try {
        const tipMenuResponse = await fetch(`/api/streams/${streamId}/tip-menu-stats`);
        if (tipMenuResponse.ok) {
          const tipMenuData = await tipMenuResponse.json();
          if (tipMenuData.totalPurchases > 0) {
            tipMenuStats = tipMenuData;
          }
        }
      } catch (tipMenuErr) {
        console.error('Failed to fetch menu stats:', tipMenuErr);
      }

      let ticketStats: StreamSummaryData['ticketStats'];
      if (announcedTicketedStream) {
        try {
          const [statsRes, attendeesRes] = await Promise.all([
            fetch(`/api/shows/${announcedTicketedStream.id}/stats`),
            fetch(`/api/shows/${announcedTicketedStream.id}/attendees`),
          ]);

          if (statsRes.ok && attendeesRes.ok) {
            const statsData = await statsRes.json();
            const attendeesData = await attendeesRes.json();

            ticketStats = {
              ticketsSold: statsData.stats?.ticketsSold || vipTicketCount,
              ticketRevenue: statsData.stats?.totalRevenue || 0,
              ticketBuyers: attendeesData.attendees?.map((a: any) => ({
                username: a.user?.username || 'Unknown',
                displayName: a.user?.displayName || null,
                avatarUrl: a.user?.avatarUrl || null,
              })) || [],
            };
          }
        } catch (ticketErr) {
          console.error('Failed to fetch ticket stats:', ticketErr);
        }
      }

      if (streamResponse.ok) {
        const finalStream = streamData.stream;
        const duration = finalStream.durationSeconds
          ? formatDurationFromSeconds(finalStream.durationSeconds)
          : formatDuration();

        const dbTotalViews = finalStream.totalViews || 0;
        const dbPeakViewers = finalStream.peakViewers || 0;

        setStreamSummary({
          duration,
          totalViewers: Math.max(dbTotalViews, peakViewers, viewerCount),
          peakViewers: Math.max(dbPeakViewers, peakViewers),
          totalEarnings: finalStream.totalGiftsReceived || totalEarnings,
          topSupporters: leaderboardData.leaderboard?.slice(0, 3) || [],
          ticketStats,
          tipMenuStats,
        });
      }
    } catch (err) {
      console.error('Failed to fetch stream summary:', err);
    }
  };

  const handleEndStream = async () => {
    if (announcedTicketedStream && !vipModeActive && !showVipEndChoice) {
      try {
        const res = await fetch(`/api/shows/${announcedTicketedStream.id}`);
        if (res.ok) {
          const data = await res.json();
          setVipTicketCount(data.show?.ticketsSold || 0);
        }
      } catch (e) {
        console.error('Failed to fetch VIP show info:', e);
      }
      setShowEndConfirm(false);
      setShowVipEndChoice(true);
      return;
    }

    setIsEnding(true);
    setHasManuallyEnded(true);
    setToken('');

    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchStreamSummary();
        setShowEndConfirm(false);
        setShowVipEndChoice(false);

        if (recordings.length > 0) {
          setShowSaveRecordingsModal(true);
        } else {
          setShowStreamSummary(true);
        }
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to end stream');
        setHasManuallyEnded(false);
        setShowEndConfirm(false);
        setShowVipEndChoice(false);
      }
    } catch (err) {
      showError('Failed to end stream');
      setHasManuallyEnded(false);
      setShowEndConfirm(false);
      setShowVipEndChoice(false);
    } finally {
      setIsEnding(false);
    }
  };

  const handleEndStreamKeepVip = async () => {
    setShowVipEndChoice(false);
    setIsEnding(true);
    setHasManuallyEnded(true);
    setToken('');

    try {
      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchStreamSummary();
        setShowStreamSummary(true);
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to end stream');
        setHasManuallyEnded(false);
      }
    } catch (err) {
      showError('Failed to end stream');
      setHasManuallyEnded(false);
    } finally {
      setIsEnding(false);
    }
  };

  const handleEndStreamCancelVip = async () => {
    if (!announcedTicketedStream) return;

    setShowVipEndChoice(false);
    setIsEnding(true);
    setHasManuallyEnded(true);
    setToken('');

    try {
      const cancelRes = await fetch(`/api/shows/${announcedTicketedStream.id}/cancel`, {
        method: 'POST',
      });

      if (!cancelRes.ok) {
        const data = await cancelRes.json();
        showError(data.error || 'Failed to cancel VIP show');
        setHasManuallyEnded(false);
        setIsEnding(false);
        return;
      }

      const response = await fetch(`/api/streams/${streamId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchStreamSummary();
        setAnnouncedTicketedStream(null);
        setShowStreamSummary(true);
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to end stream');
        setHasManuallyEnded(false);
      }
    } catch (err) {
      showError('Failed to end stream');
      setHasManuallyEnded(false);
    } finally {
      setIsEnding(false);
    }
  };

  return {
    isEnding,
    vipTicketCount,
    showVipEndChoice,
    setShowVipEndChoice,
    setVipTicketCount,
    streamSummary,
    handleEndStream,
    handleEndStreamKeepVip,
    handleEndStreamCancelVip,
  };
}
