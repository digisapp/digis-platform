'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Lock, Wallet, CheckCircle } from 'lucide-react';

interface StreamAccessModalProps {
  streamId: string;
  streamTitle: string;
  creatorName: string;
  price: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StreamAccessModal({
  streamId,
  streamTitle,
  creatorName,
  price,
  onClose,
  onSuccess,
}: StreamAccessModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

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
      console.error('[StreamAccessModal] Error fetching balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handlePurchase = async () => {
    setError('');
    setLoading(true);

    try {
      // Check balance
      if (balance < price) {
        throw new Error('Insufficient coins. Please add more coins to your wallet.');
      }

      const response = await fetch(`/api/streams/${streamId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase access');
      }

      // Update balance
      setBalance(data.newBalance);
      setPurchaseComplete(true);

      // Call success callback after short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Refresh the page to show the stream
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase access');
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughCoins = balance >= price;

  if (purchaseComplete) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <div className="bg-white rounded-2xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Granted!</h2>
            <p className="text-gray-600 mb-6">
              You can now watch {streamTitle}
            </p>
            <div className="animate-pulse text-sm text-gray-500">
              Loading stream...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Private Stream Access</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-900 text-2xl font-light"
            >
              ✕
            </button>
          </div>

          {/* Lock Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>

          {/* Stream Info */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{streamTitle}</h3>
            <p className="text-sm text-gray-600">by {creatorName}</p>
          </div>

          {/* Price Breakdown */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700 font-medium">Access Price</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
                  {price}
                </span>
                <span className="text-gray-600">coins</span>
              </div>
            </div>

            <div className="pt-4 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700 font-medium">Your Balance</span>
                </div>
                {loadingBalance ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xl font-bold ${
                        hasEnoughCoins ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {balance}
                    </span>
                    <span className="text-gray-600">coins</span>
                  </div>
                )}
              </div>

              {!loadingBalance && !hasEnoughCoins && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  Need {price - balance} more coins
                </div>
              )}
            </div>
          </div>

          {/* Benefits List */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Instant access to live stream</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Participate in live chat</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Send tips and gifts</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Access for the duration of the stream</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {hasEnoughCoins ? (
              <button
                onClick={handlePurchase}
                disabled={loading || loadingBalance}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 hover:scale-105 shadow-lg"
              >
                {loading ? <LoadingSpinner size="sm" /> : `Purchase for ${price} coins`}
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

          <p className="text-xs text-gray-500 text-center mt-4">
            Secure payment processed with your wallet balance
          </p>
        </div>
      </div>
    </div>
  );
}
