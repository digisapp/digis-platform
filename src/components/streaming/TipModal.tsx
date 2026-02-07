'use client';

import { useState } from 'react';
import { Coins, X } from 'lucide-react';
import { PaymentErrorBoundary } from '@/components/error-boundaries';

interface TipModalProps {
  creatorUsername: string;
  userBalance: number;
  onSendTip: (amount: number, note?: string) => Promise<void>;
  onClose: () => void;
}

export function TipModal({ creatorUsername, userBalance, onSendTip, onClose }: TipModalProps) {
  const [tipAmount, setTipAmount] = useState('');
  const [tipNote, setTipNote] = useState('');

  const handleClose = () => {
    setTipAmount('');
    setTipNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-safe" role="dialog" aria-modal="true" aria-label="Send tip">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
      />
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-gradient-to-br from-cyan-900/95 via-black/98 to-purple-900/95 rounded-2xl border-2 border-cyan-400/60 shadow-[0_0_60px_rgba(34,211,238,0.4)] p-6 animate-slideUp">
      <PaymentErrorBoundary transactionType="tip" onClose={handleClose}>
        {/* Corner accents - Tron style */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex justify-center mb-4">
          <div className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/30">
            <Coins className="w-4 h-4" />
            SEND TIP
          </div>
        </div>

        {/* Creator Name */}
        <p className="text-white/80 text-center text-sm mb-4">
          Tip <span className="font-bold text-cyan-300">@{creatorUsername}</span>
        </p>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-cyan-300 text-xs font-semibold mb-2">Amount (coins)</label>
          <input
            type="number"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            placeholder="Enter amount..."
            min="1"
            max={userBalance}
            className="w-full px-4 py-3 bg-white/10 border-2 border-cyan-400/40 rounded-xl text-white text-lg font-bold placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all text-center"
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-4">
          {[10, 50, 100, 500].map((amt) => (
            <button
              key={amt}
              onClick={() => setTipAmount(amt.toString())}
              disabled={userBalance < amt}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                tipAmount === amt.toString()
                  ? 'bg-cyan-500 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } ${userBalance < amt ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Private Note Input */}
        <div className="mb-4">
          <label className="block text-cyan-300 text-xs font-semibold mb-1.5">
            Private Note <span className="text-white/40">(optional)</span>
          </label>
          <textarea
            value={tipNote}
            onChange={(e) => setTipNote(e.target.value.slice(0, 200))}
            placeholder="Write a private message..."
            rows={2}
            className="w-full px-3 py-2 bg-white/10 border border-cyan-400/40 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all resize-none text-sm"
          />
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5 text-xs text-cyan-400/70">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Only the creator will see this</span>
            </div>
            <span className="text-xs text-white/40">{tipNote.length}/200</span>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={async () => {
            const amount = parseInt(tipAmount);
            if (amount > 0 && amount <= userBalance) {
              await onSendTip(amount, tipNote || undefined);
              handleClose();
            }
          }}
          disabled={!tipAmount || parseInt(tipAmount) <= 0 || parseInt(tipAmount) > userBalance}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:via-cyan-300 hover:to-cyan-400 rounded-xl font-bold text-black text-lg transition-all hover:scale-105 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Coins className="w-5 h-5" />
          {tipAmount ? `Send ${parseInt(tipAmount).toLocaleString()} Coins` : 'Enter Amount'}
        </button>

        {/* Cancel text */}
        <p className="text-center text-gray-500 text-xs mt-3">
          Tap outside to cancel
        </p>
      </PaymentErrorBoundary>
      </div>
    </div>
  );
}
