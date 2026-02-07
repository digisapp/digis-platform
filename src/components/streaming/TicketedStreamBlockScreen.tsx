'use client';

import { Ticket, Coins } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface TicketedStreamBlockScreenProps {
  ticketedShowInfo: {
    showTitle: string;
    ticketPrice: number;
  };
  purchasingTicket: boolean;
  userBalance: number;
  currentUser: any;
  onPurchase: () => void;
  onBuyCoins: () => void;
}

export function TicketedStreamBlockScreen({
  ticketedShowInfo,
  purchasingTicket,
  userBalance,
  currentUser,
  onPurchase,
  onBuyCoins,
}: TicketedStreamBlockScreenProps) {
  return (
    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6">
      {/* Compact layout for mobile */}
      <div className="flex flex-col items-center max-w-xs w-full">
        {/* Lock Icon + Badge combined */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 mb-3 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/50 flex items-center justify-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1 text-center line-clamp-2">
          {ticketedShowInfo.showTitle}
        </h2>

        {/* Ticketed Stream Badge */}
        <div className="mb-3 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full">
          <span className="text-amber-400 font-semibold text-xs">TICKETED STREAM</span>
        </div>

        {/* Price + Buy Button combined */}
        <button
          onClick={onPurchase}
          disabled={purchasingTicket}
          className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-base hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {purchasingTicket ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Purchasing...</span>
            </>
          ) : (
            <>
              <Ticket className="w-4 h-4" />
              <span>Buy Ticket</span>
              <span className="mx-1">&bull;</span>
              <Coins className="w-4 h-4 text-yellow-200" />
              <span>{ticketedShowInfo.ticketPrice}</span>
            </>
          )}
        </button>

        {/* Balance indicator */}
        {currentUser && (
          <p className="mt-2 text-xs text-gray-400">
            Your balance: <Coins className="w-3 h-3 inline text-yellow-400" /> {userBalance}
            {userBalance < ticketedShowInfo.ticketPrice && (
              <button
                onClick={onBuyCoins}
                className="ml-2 text-cyan-400 hover:underline"
              >
                Get more
              </button>
            )}
          </p>
        )}

        {/* FOMO message - compact */}
        <p className="mt-3 text-gray-500 text-xs text-center">
          Chat visible below
        </p>
      </div>
    </div>
  );
}
