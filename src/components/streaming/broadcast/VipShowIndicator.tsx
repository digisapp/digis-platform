'use client';

import { Coins, Play, Square, Ticket } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface VipShowIndicatorProps {
  announcedTicketedStream: { id: string; title: string; ticketPrice: number; startsAt: Date };
  vipModeActive: boolean;
  ticketedCountdown: string;
  vipTicketCount: number;
  startingVipStream: boolean;
  onStartVip: () => void;
  onEndVip: () => void;
}

/**
 * Indicator overlay for VIP ticketed shows.
 * Shows either "VIP LIVE" with end button (when active)
 * or countdown + ticket info + start button (when pending).
 */
export function VipShowIndicator({
  announcedTicketedStream,
  vipModeActive,
  ticketedCountdown,
  vipTicketCount,
  startingVipStream,
  onStartVip,
  onEndVip,
}: VipShowIndicatorProps) {
  if (vipModeActive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 backdrop-blur-xl bg-red-500/30 rounded-xl border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
        <div className="text-left min-w-0">
          <div className="text-red-400 font-bold text-xs uppercase">LIVE</div>
          <div className="text-white text-xs truncate max-w-[120px] sm:max-w-[180px]">
            {announcedTicketedStream.title}
          </div>
        </div>
        <button
          onClick={onEndVip}
          className="ml-1 flex items-center gap-1 px-2.5 py-1.5 bg-red-500/80 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all shadow-lg flex-shrink-0"
        >
          <Square className="w-3 h-3" />
          End
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 backdrop-blur-xl bg-amber-500/20 rounded-xl border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
      <Ticket className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <div className="text-left min-w-0">
        <div className="text-white text-xs font-medium truncate max-w-[100px] sm:max-w-[150px]">
          {announcedTicketedStream.title}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-amber-400/80">
            <Coins className="w-3 h-3 inline" /> {announcedTicketedStream.ticketPrice}
          </span>
          {vipTicketCount > 0 && (
            <span className="text-green-400 font-medium">
              {vipTicketCount} sold
            </span>
          )}
        </div>
        {ticketedCountdown && (
          <div className="text-cyan-400 text-[10px] font-mono font-semibold mt-0.5">
            ⏱ {ticketedCountdown}
          </div>
        )}
      </div>
      <button
        onClick={onStartVip}
        disabled={startingVipStream}
        className="ml-1 flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 shadow-lg flex-shrink-0"
      >
        {startingVipStream ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            <Play className="w-3 h-3" />
            <span className="hidden sm:inline">Start</span>
          </>
        )}
      </button>
    </div>
  );
}
