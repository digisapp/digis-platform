'use client';

import { useState, useEffect } from 'react';
import { Gift, Coins, X, Star, ExternalLink } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToastContext } from '@/context/ToastContext';

interface SpotlightedCreator {
  id: string;
  creatorId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  isSpotlighted: boolean;
}

interface SpotlightedCreatorOverlayProps {
  streamId: string;
  isHost?: boolean;
  onTipSent?: (amount: number) => void;
}

const TIP_AMOUNTS = [10, 25, 50, 100, 500];

export function SpotlightedCreatorOverlay({ streamId, isHost = false, onTipSent }: SpotlightedCreatorOverlayProps) {
  const { showError } = useToastContext();
  const [spotlightedCreator, setSpotlightedCreator] = useState<SpotlightedCreator | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);

  // Fetch spotlighted creator
  useEffect(() => {
    const fetchSpotlighted = async () => {
      try {
        const response = await fetch(`/api/streams/${streamId}/featured`);
        const data = await response.json();

        if (response.ok) {
          const spotlighted = (data.featuredCreators || []).find((c: SpotlightedCreator) => c.isSpotlighted);

          // Check if spotlight changed
          if (spotlighted?.creatorId !== spotlightedCreator?.creatorId) {
            if (spotlighted) {
              // New creator spotlighted - trigger animation
              setShowAnimation(true);
              setTimeout(() => setShowAnimation(false), 3000);
            }
          }

          setSpotlightedCreator(spotlighted || null);
        }
      } catch (err) {
        console.error('Error fetching spotlighted creator:', err);
      }
    };

    fetchSpotlighted();
    // Poll every 5 seconds
    const interval = setInterval(fetchSpotlighted, 5000);
    return () => clearInterval(interval);
  }, [streamId, spotlightedCreator?.creatorId]);

  // Fetch user balance when tip modal opens
  useEffect(() => {
    if (showTipModal && !isHost) {
      fetch('/api/wallet/balance')
        .then(res => res.json())
        .then(data => {
          if (data.balance !== undefined) {
            setUserBalance(data.balance);
          }
        })
        .catch(console.error);
    }
  }, [showTipModal, isHost]);

  const handleSendTip = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;

    if (!amount || amount < 1) {
      showError('Please enter a valid amount');
      return;
    }

    if (userBalance !== null && amount > userBalance) {
      showError('Insufficient balance');
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/featured/${spotlightedCreator?.creatorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowTipModal(false);
        setCustomAmount('');
        onTipSent?.(amount);
        // Update balance
        if (userBalance !== null) {
          setUserBalance(userBalance - amount);
        }
      } else {
        showError(data.error || 'Failed to send gift');
      }
    } catch (err) {
      console.error('Error sending gift:', err);
      showError('Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  if (!spotlightedCreator) {
    return null;
  }

  return (
    <>
      {/* Spotlighted Creator Overlay - Bottom Left of Video */}
      <div
        className={`absolute bottom-20 sm:bottom-16 left-3 z-10 transition-all duration-500 ${
          showAnimation ? 'animate-spotlight-enter' : ''
        }`}
      >
        <div className="flex items-center gap-2 p-2 pr-3 backdrop-blur-xl bg-gradient-to-r from-pink-500/20 to-pink-600/20 rounded-full border border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.4)]">
          {/* Star Icon */}
          <div className="absolute -top-1 -left-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <Star className="w-3 h-3 text-white fill-current" />
          </div>

          {/* Avatar */}
          <a
            href={`/${spotlightedCreator.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative"
          >
            {spotlightedCreator.avatarUrl ? (
              <img
                src={spotlightedCreator.avatarUrl}
                alt={spotlightedCreator.displayName || spotlightedCreator.username}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-pink-500 shadow-lg"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold border-2 border-pink-500">
                {(spotlightedCreator.displayName || spotlightedCreator.username)?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </a>

          {/* Info */}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Featured</span>
            <a
              href={`/${spotlightedCreator.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold text-sm truncate max-w-[100px] sm:max-w-[120px] hover:text-pink-400 transition-colors"
            >
              {spotlightedCreator.displayName || spotlightedCreator.username}
            </a>
          </div>

          {/* Gift Button - Viewers only */}
          {!isHost && (
            <button
              onClick={() => setShowTipModal(true)}
              className="ml-1 flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full text-white hover:scale-105 transition-transform shadow-lg animate-pulse hover:animate-none"
              title="Send gift to featured creator"
            >
              <Gift className="w-4 h-4" />
              <span className="text-xs font-bold">GIFT</span>
            </button>
          )}
        </div>
      </div>

      {/* Gift Modal */}
      {showTipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTipModal(false)}
          />
          <div className="relative bg-black/90 backdrop-blur-xl rounded-2xl border border-pink-500/30 p-5 w-full max-w-sm shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Gift Featured Creator</h3>
              <button
                onClick={() => setShowTipModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3 p-3 bg-pink-500/10 rounded-xl border border-pink-500/30 mb-4">
              {spotlightedCreator.avatarUrl ? (
                <img
                  src={spotlightedCreator.avatarUrl}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-pink-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold">
                  {(spotlightedCreator.displayName || spotlightedCreator.username)?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="font-bold text-white">
                  {spotlightedCreator.displayName || spotlightedCreator.username}
                </div>
                <div className="text-sm text-pink-400">@{spotlightedCreator.username}</div>
              </div>
            </div>

            {/* Balance */}
            {userBalance !== null && (
              <div className="flex items-center justify-between mb-4 p-2 bg-white/5 rounded-lg">
                <span className="text-gray-400 text-sm">Your Balance</span>
                <span className="text-pink-400 font-bold flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {userBalance.toLocaleString()}
                </span>
              </div>
            )}

            {/* Quick Amounts */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {TIP_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                  className={`py-2 px-1 rounded-lg text-sm font-bold transition-all ${
                    selectedAmount === amount && !customAmount
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="mb-4">
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400" />
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
                  min="1"
                />
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendTip}
              disabled={isSending || (!customAmount && !selectedAmount)}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Send {customAmount || selectedAmount} Coins
                </>
              )}
            </button>

            {/* View Profile Link */}
            <a
              href={`/${spotlightedCreator.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 mt-3 text-sm text-gray-400 hover:text-pink-400 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Profile
            </a>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes spotlight-enter {
          0% {
            opacity: 0;
            transform: translateX(-50px) scale(0.8);
          }
          50% {
            transform: translateX(10px) scale(1.1);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-spotlight-enter {
          animation: spotlight-enter 0.6s ease-out;
        }
      `}</style>
    </>
  );
}
