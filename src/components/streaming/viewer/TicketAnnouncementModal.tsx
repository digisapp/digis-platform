'use client';

import React from 'react';
import { X, Ticket, Coins } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TicketAnnouncementModalProps {
  announcement: {
    ticketedStreamId: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
    minutesUntilStart: number;
  };
  userBalance: number;
  currentUser: any;
  quickBuyLoading: boolean;
  onPurchase: (showId: string, price: number) => void;
  onDismiss: (dismissed: { ticketedStreamId: string; title: string; ticketPrice: number; startsAt: string }) => void;
  onBuyCoins: () => void;
}

export function TicketAnnouncementModal({
  announcement,
  userBalance,
  currentUser,
  quickBuyLoading,
  onPurchase,
  onDismiss,
  onBuyCoins,
}: TicketAnnouncementModalProps) {
  const handleDismiss = () => {
    onDismiss({
      ticketedStreamId: announcement.ticketedStreamId,
      title: announcement.title,
      ticketPrice: announcement.ticketPrice,
      startsAt: announcement.startsAt,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-safe" role="dialog" aria-modal="true" aria-label="Ticketed show announcement">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleDismiss}
      />
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gradient-to-br from-amber-900/95 via-black/98 to-purple-900/95 rounded-2xl border-2 border-amber-500/60 shadow-[0_0_60px_rgba(245,158,11,0.4)] p-6 animate-slideUp">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ticketed Badge */}
        <div className="flex justify-center mb-3">
          <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30">
            <Ticket className="w-4 h-4" />
            PRIVATE STREAM
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">
          {announcement.title}
        </h3>

        {/* Time */}
        <p className="text-amber-300 text-center text-sm mb-4">
          Starts in {announcement.minutesUntilStart} minutes
        </p>

        {/* Price + Balance */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span className="text-3xl font-bold text-white">
              {announcement.ticketPrice}
            </span>
            <span className="text-gray-400">coins</span>
          </div>
          {currentUser && (
            <p className="text-xs text-gray-400">
              Your balance: {userBalance} coins
              {userBalance < announcement.ticketPrice && (
                <button
                  onClick={onBuyCoins}
                  className="ml-2 text-cyan-400 hover:underline"
                >
                  Get more
                </button>
              )}
            </p>
          )}
        </div>

        {/* Buy Button - Instant Purchase */}
        <button
          onClick={() => onPurchase(announcement.ticketedStreamId, announcement.ticketPrice)}
          disabled={quickBuyLoading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 rounded-xl font-bold text-black text-lg transition-all hover:scale-105 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {quickBuyLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Purchasing...</span>
            </>
          ) : (
            <>
              <Ticket className="w-5 h-5" />
              Buy Ticket
            </>
          )}
        </button>

        {/* Dismiss text */}
        <p className="text-center text-gray-500 text-xs mt-3">
          Tap outside to dismiss
        </p>
      </div>
    </div>
  );
}
