'use client';

import { useState, useEffect } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';

interface Show {
  id: string;
  title: string;
  ticketPrice: number;
  scheduledStart: string;
  durationMinutes: number;
  coverImageUrl: string | null;
  creator: {
    username: string;
    displayName: string | null;
  };
}

interface TicketPurchaseModalProps {
  show: Show;
  onClose: () => void;
  onSuccess: () => void;
}

export function TicketPurchaseModal({ show, onClose, onSuccess }: TicketPurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

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
      console.error('Error fetching balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handlePurchase = async () => {
    setError('');
    setLoading(true);

    try {
      // Check balance
      if (balance < show.ticketPrice) {
        throw new Error('Insufficient coins. Please add more coins to your wallet.');
      }

      const response = await fetch(`/api/shows/${show.id}/purchase`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase ticket');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purchase ticket');
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughCoins = balance >= show.ticketPrice;
  const scheduledDate = new Date(show.scheduledStart);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border-2 border-purple-500/50 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Purchase Ticket</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Show Preview */}
          <div className="mb-6">
            {show.coverImageUrl && (
              <div className="aspect-video rounded-lg overflow-hidden mb-4">
                <img
                  src={show.coverImageUrl}
                  alt={show.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h3 className="text-lg font-bold text-white mb-2">{show.title}</h3>
            <div className="text-sm text-gray-400 space-y-1">
              <div>by {show.creator.displayName || show.creator.username}</div>
              <div>📅 {format(scheduledDate, 'PPP')}</div>
              <div>⏰ {format(scheduledDate, 'p')}</div>
              <div>⏱️ {show.durationMinutes} minutes</div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-black/40 rounded-xl border border-white/10 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">Ticket Price</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-400">{show.ticketPrice}</span>
                <span className="text-gray-400">coins</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Your Balance</span>
                {loadingBalance ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${hasEnoughCoins ? 'text-green-400' : 'text-red-400'}`}>
                      {balance}
                    </span>
                    <span className="text-gray-400">coins</span>
                  </div>
                )}
              </div>

              {!loadingBalance && !hasEnoughCoins && (
                <div className="mt-2 text-xs text-red-400">
                  Need {show.ticketPrice - balance} more coins
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <GlassButton
              type="button"
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </GlassButton>

            {hasEnoughCoins ? (
              <GlassButton
                type="button"
                variant="gradient"
                size="lg"
                onClick={handlePurchase}
                className="flex-1"
                disabled={loading || loadingBalance}
                shimmer
                glow
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Confirm Purchase'}
              </GlassButton>
            ) : (
              <GlassButton
                type="button"
                variant="gradient"
                size="lg"
                onClick={() => window.location.href = '/wallet'}
                className="flex-1"
                disabled={loadingBalance}
                shimmer
              >
                Add Coins
              </GlassButton>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            By purchasing, you agree to the stream's terms and refund policy
          </p>
        </div>
      </div>
    </div>
  );
}
