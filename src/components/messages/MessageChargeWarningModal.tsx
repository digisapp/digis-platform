'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface MessageChargeWarningModalProps {
  recipientName: string;
  messageCharge: number;
  messagePreview: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function MessageChargeWarningModal({
  recipientName,
  messageCharge,
  messagePreview,
  onClose,
  onConfirm,
}: MessageChargeWarningModalProps) {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error('[MessageChargeWarningModal] Error fetching balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const hasEnoughBalance = balance >= messageCharge;

  const handleConfirm = async () => {
    if (!hasEnoughBalance) return;

    setConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('[MessageChargeWarningModal] Error confirming:', error);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] animate-in zoom-in-95 duration-200 mx-auto">
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
        </div>

        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Icon and Title */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-2 bg-purple-500/30 rounded-full blur-xl"></div>
              <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                <Send className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-1">
              Paid Message
            </h3>
            <p className="text-gray-400 text-sm">to {recipientName}</p>
          </div>

          {/* Cost Info - Tron Style */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 mb-6 text-center border-2 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <p className="text-gray-400 text-sm mb-2 font-medium">Cost per Message</p>
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {messageCharge}
            </div>
            <p className="text-gray-400 text-sm mt-1 font-medium">coins</p>
          </div>

          {/* Insufficient balance warning */}
          {!loadingBalance && !hasEnoughBalance && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              Insufficient balance. You have {balance} coins.
            </div>
          )}

          {/* Action Buttons - Tron Style */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={confirming}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-gray-600"
            >
              Decline
            </button>

            {hasEnoughBalance ? (
              <button
                onClick={handleConfirm}
                disabled={confirming || loadingBalance}
                className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {confirming ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Accept'
                )}
              </button>
            ) : (
              <button
                onClick={() => router.push('/wallet')}
                disabled={loadingBalance}
                className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                Buy Coins
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
