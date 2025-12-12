'use client';

import { useState, useEffect } from 'react';
import type { VirtualGift } from '@/db/schema';
import { X, Minus, Plus, Coins, ChevronUp } from 'lucide-react';

type FloatingGiftBarProps = {
  streamId: string;
  creatorId: string;
  onSendGift: (giftId: string, quantity: number) => Promise<void>;
  userBalance: number;
  isAuthenticated: boolean;
  onAuthRequired?: () => void;
  onBuyCoins?: () => void; // Callback when user clicks balance to buy more coins
  inline?: boolean; // If true, renders inline instead of floating
};

export function FloatingGiftBar({
  streamId,
  creatorId,
  onSendGift,
  userBalance,
  isAuthenticated,
  onAuthRequired,
  onBuyCoins,
  inline = false
}: FloatingGiftBarProps) {
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Featured gifts to show in the floating bar (mix of rarities)
  const featuredGifts = gifts.slice(0, 6);

  useEffect(() => {
    fetchGifts();
  }, []);

  const fetchGifts = async () => {
    try {
      const response = await fetch('/api/gifts');
      const data = await response.json();
      // Sort by popularity/coin cost for featured display
      const sortedGifts = (data.gifts || []).sort((a: VirtualGift, b: VirtualGift) => {
        // Show a mix: some cheap, some expensive
        const rarityOrder: Record<string, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };
        return (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
      });
      setGifts(sortedGifts);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const handleGiftClick = (gift: VirtualGift) => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    setSelectedGift(gift);
    setQuantity(1);
  };

  const handleSendGift = async () => {
    if (!selectedGift || isSending) return;

    const totalCost = selectedGift.coinCost * quantity;

    if (totalCost > userBalance) {
      alert('Insufficient balance! Please purchase more coins.');
      return;
    }

    setIsSending(true);
    try {
      await onSendGift(selectedGift.id, quantity);
      setSelectedGift(null);
      setQuantity(1);
    } catch (error: any) {
      alert(error.message || 'Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  const totalCost = selectedGift ? selectedGift.coinCost * quantity : 0;
  const canAfford = totalCost <= userBalance;

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'rare': return 'shadow-blue-500/50';
      case 'epic': return 'shadow-purple-500/50';
      case 'legendary': return 'shadow-yellow-500/50 animate-pulse';
      default: return '';
    }
  };

  if (gifts.length === 0) return null;

  return (
    <>
      {/* Gift Bar - inline or floating based on prop */}
      <div className={inline
        ? "w-full relative"
        : "fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      }>
        {/* Quick Send Modal */}
        {selectedGift && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 sm:w-80 z-[100]">
            <div className="backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl p-4 animate-slideUp">
              {/* Close button */}
              <button
                onClick={() => setSelectedGift(null)}
                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Gift Preview */}
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl animate-bounce">{selectedGift.emoji}</div>
                <div>
                  <div className="font-bold text-white">{selectedGift.name}</div>
                  <div className="text-sm text-cyan-400">{selectedGift.coinCost} coins</div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="text-2xl font-bold text-white w-12 text-center">{quantity}</div>
                <button
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick quantity buttons */}
              <div className="flex gap-2 mb-4">
                {[1, 5, 10, 25].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      quantity === q
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {q}x
                  </button>
                ))}
              </div>

              {/* Total & Send Button */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-400">Total</div>
                  <div className={`text-lg font-bold ${canAfford ? 'text-cyan-400' : 'text-red-400'}`}>
                    {totalCost.toLocaleString()} coins
                  </div>
                </div>
                <button
                  onClick={handleSendGift}
                  disabled={!canAfford || isSending}
                  className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-xl font-bold text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <span className="text-lg">{selectedGift.emoji}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Balance warning */}
              {!canAfford && (
                <div className="mt-3 text-center text-sm text-red-400">
                  Need {(totalCost - userBalance).toLocaleString()} more coins
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expand Button - shows all gifts */}
        {isExpanded && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[90vw] max-w-md z-[100]">
            <div className="backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-2xl p-4 animate-slideUp max-h-[50vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">All Gifts</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {gifts.map((gift) => {
                  const canAffordGift = gift.coinCost <= userBalance;
                  return (
                    <button
                      key={gift.id}
                      onClick={() => {
                        handleGiftClick(gift);
                        setIsExpanded(false);
                      }}
                      disabled={!canAffordGift && isAuthenticated}
                      className={`p-2 rounded-xl border transition-all ${
                        canAffordGift || !isAuthenticated
                          ? 'border-white/20 hover:border-cyan-500/50 hover:bg-white/10 hover:scale-105'
                          : 'border-white/10 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-2xl mb-1">{gift.emoji}</div>
                      <div className="text-xs text-gray-400">{gift.coinCost}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Gift Buttons */}
        <div className={inline
          ? "flex items-center gap-1.5 px-2 py-1.5 bg-black/50 overflow-x-auto scrollbar-hide"
          : "flex items-center gap-1.5 px-2 py-2 backdrop-blur-xl bg-black/70 rounded-full border border-white/20 shadow-2xl"
        }>
          {/* Featured Gifts with bobbing animation */}
          {featuredGifts.map((gift, index) => {
            const canAffordGift = gift.coinCost <= userBalance;
            return (
              <button
                key={gift.id}
                onClick={() => handleGiftClick(gift)}
                className={`relative group transition-all duration-300 hover:scale-125 flex-shrink-0 ${getRarityGlow(gift.rarity)}`}
                style={inline ? undefined : {
                  animation: `float ${2 + index * 0.3}s ease-in-out infinite`,
                  animationDelay: `${index * 0.2}s`
                }}
                title={`${gift.name} - ${gift.coinCost} coins`}
              >
                <div className={`${inline ? 'text-xl' : 'text-2xl sm:text-3xl'} ${!canAffordGift && isAuthenticated ? 'grayscale opacity-50' : ''}`}>
                  {gift.emoji}
                </div>
                {/* Price tooltip on hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 rounded-lg text-xs text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {gift.coinCost}
                </div>
              </button>
            );
          })}

          {/* More gifts button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={inline
              ? "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 flex-shrink-0"
              : "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110"
            }
          >
            <ChevronUp className={`${inline ? 'w-4 h-4' : 'w-5 h-5'} transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Balance indicator - clickable to buy more coins */}
          <button
            onClick={onBuyCoins}
            className={`${inline
              ? "flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30 flex-shrink-0"
              : "flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30"
            } hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50 transition-all hover:scale-105 active:scale-95`}
            title="Buy more coins"
          >
            <Coins className={`${inline ? 'w-3 h-3' : 'w-4 h-4'} text-green-400`} />
            <span className={`${inline ? 'text-xs' : 'text-sm'} font-bold text-green-400`}>{userBalance.toLocaleString()}</span>
            <Plus className={`${inline ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-green-400/60`} />
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
