'use client';

import { useState, useEffect } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Lock, Unlock, Image, Film } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: 'photo' | 'video';
  unlockPrice: number;
  thumbnail: string | null;
  creatorName: string;
}

interface ContentUnlockModalProps {
  content: ContentItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContentUnlockModal({ content, onClose, onSuccess }: ContentUnlockModalProps) {
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

  const handleUnlock = async () => {
    setError('');
    setLoading(true);

    try {
      if (balance < content.unlockPrice) {
        throw new Error('Insufficient coins. Please add more coins to your wallet.');
      }

      const response = await fetch(`/api/content/${content.id}/purchase`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock content');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock content');
    } finally {
      setLoading(false);
    }
  };

  const hasEnoughCoins = balance >= content.unlockPrice;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border-2 border-cyan-500/50 max-w-md w-full shadow-[0_0_50px_rgba(34,211,238,0.2)]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Lock className="w-6 h-6 text-yellow-400" />
              Unlock Content
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content Preview */}
          <div className="mb-6">
            <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-gray-800 relative">
              {content.thumbnail ? (
                <img
                  src={content.thumbnail}
                  alt={content.title}
                  className="w-full h-full object-cover blur-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  {content.type === 'photo' ? (
                    <Image className="w-16 h-16 text-gray-600" />
                  ) : (
                    <Film className="w-16 h-16 text-gray-600" />
                  )}
                </div>
              )}
              {/* Lock Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="p-4 rounded-full bg-yellow-500/20 border border-yellow-500/50">
                  <Lock className="w-10 h-10 text-yellow-400" />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-1">{content.title}</h3>
            <p className="text-sm text-gray-400">by {content.creatorName}</p>
          </div>

          {/* Price Breakdown */}
          <div className="bg-black/40 rounded-xl border border-white/10 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400">Unlock Price</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-400">{content.unlockPrice}</span>
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
                  Need {content.unlockPrice - balance} more coins
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
                onClick={handleUnlock}
                className="flex-1"
                disabled={loading || loadingBalance}
                shimmer
                glow
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Unlock className="w-5 h-5" />
                    Unlock Now
                  </span>
                )}
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
            Once unlocked, you'll have permanent access to this content
          </p>
        </div>
      </div>
    </div>
  );
}
