'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Wallet, DollarSign, X, Send } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Paid Message</h2>
              <p className="text-sm text-gray-600">Confirm before sending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Message Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-gray-800 text-sm line-clamp-3">
                {messagePreview}
              </p>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sending To
            </label>
            <div className="flex items-center gap-2 text-gray-900 font-medium">
              <span className="text-lg">📨</span>
              <span>{recipientName}</span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700 font-medium">Message Cost</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
                  {messageCharge}
                </span>
                <span className="text-gray-600">coins</span>
              </div>
            </div>

            <div className="pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700 font-medium">Your Balance</span>
                </div>
                {loadingBalance ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xl font-bold ${
                        hasEnoughBalance ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {balance}
                    </span>
                    <span className="text-gray-600">coins</span>
                  </div>
                )}
              </div>

              {!loadingBalance && !hasEnoughBalance && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    Insufficient balance. Need {messageCharge - balance} more coins.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div className="text-sm text-blue-700">
                <p className="font-semibold mb-1">Why am I being charged?</p>
                <p>
                  {recipientName} has enabled paid messages. This helps creators
                  manage their inbox and compensates them for their time.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Your message gets priority delivery</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Higher chance of getting a response</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Support your favorite creator directly</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={confirming}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {hasEnoughBalance ? (
              <button
                onClick={handleConfirm}
                disabled={confirming || loadingBalance}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send for {messageCharge} coins</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => router.push('/wallet')}
                disabled={loadingBalance}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                Add Coins
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Charged messages cannot be refunded
          </p>
        </div>
      </div>
    </div>
  );
}
