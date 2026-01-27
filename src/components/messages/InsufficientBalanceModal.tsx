'use client';

import { useRouter } from 'next/navigation';
import { X, Coins, AlertCircle } from 'lucide-react';

interface InsufficientBalanceModalProps {
  required: number;
  balance: number;
  type: 'message' | 'media' | 'voice';
  onClose: () => void;
}

export function InsufficientBalanceModal({
  required,
  balance,
  type,
  onClose,
}: InsufficientBalanceModalProps) {
  const router = useRouter();
  const needed = required - balance;

  const typeLabel = type === 'voice' ? 'voice message' : type === 'media' ? 'media' : 'message';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[calc(80px+env(safe-area-inset-bottom,0px))] sm:pb-4 bg-black/80 backdrop-blur-md">
      <div className="relative bg-gradient-to-br from-black/90 via-gray-900 to-black/90 rounded-3xl p-6 max-w-sm w-full border-2 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)] max-h-[calc(100dvh-160px)] sm:max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">
          Insufficient Coins
        </h3>
        <p className="text-gray-400 text-sm text-center mb-6">
          You need more coins to send this {typeLabel}
        </p>

        {/* Balance Info */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Required</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold">{required}</span>
              <Coins className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your balance</span>
            <div className="flex items-center gap-1.5">
              <span className="text-red-400 font-bold">{balance}</span>
              <Coins className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center">
            <span className="text-gray-400">You need</span>
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 font-bold">+{needed}</span>
              <Coins className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => router.push('/wallet')}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-xl font-bold hover:scale-105 transition-all"
          >
            Buy Coins
          </button>
        </div>
      </div>
    </div>
  );
}
