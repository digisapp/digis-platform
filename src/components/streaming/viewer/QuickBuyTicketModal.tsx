'use client';

import React from 'react';
import { X, Ticket, Coins } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface QuickBuyTicketModalProps {
  quickBuyInfo: { showId: string; title: string; price: number };
  ticketCountdown: string | null;
  userBalance: number;
  currentUser: any;
  quickBuyLoading: boolean;
  onPurchase: (showId: string, price: number) => void;
  onClose: () => void;
  onBuyCoins: () => void;
}

export function QuickBuyTicketModal({
  quickBuyInfo,
  ticketCountdown,
  userBalance,
  currentUser,
  quickBuyLoading,
  onPurchase,
  onClose,
  onBuyCoins,
}: QuickBuyTicketModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Buy ticket">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xs bg-gradient-to-br from-amber-900/95 via-black/98 to-black/95 rounded-2xl border border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.3)] p-5">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h3 className="text-lg font-bold text-white text-center mb-1 pr-6">
          {quickBuyInfo.title}
        </h3>

        {/* Countdown */}
        {ticketCountdown && (
          <p className="text-amber-400 text-center text-sm mb-4">
            Starts in {ticketCountdown}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Coins className="w-7 h-7 text-yellow-400" />
          <span className="text-4xl font-bold text-white">{quickBuyInfo.price}</span>
        </div>

        {/* Balance */}
        {currentUser && (
          <p className="text-center text-xs text-gray-400 mb-4">
            Your balance: {userBalance} coins
            {userBalance < quickBuyInfo.price && (
              <button
                onClick={onBuyCoins}
                className="ml-2 text-cyan-400 hover:underline"
              >
                Get more
              </button>
            )}
          </p>
        )}

        {/* Buy Button */}
        <button
          onClick={() => onPurchase(quickBuyInfo.showId, quickBuyInfo.price)}
          disabled={quickBuyLoading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl font-bold text-black text-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {quickBuyLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Buying...</span>
            </>
          ) : (
            <>
              <Ticket className="w-5 h-5" />
              Buy Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}
