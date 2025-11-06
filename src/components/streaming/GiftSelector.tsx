'use client';

import { useState, useEffect } from 'react';
import type { VirtualGift } from '@/db/schema';
import { GlassButton } from '@/components/ui/GlassButton';

type GiftSelectorProps = {
  streamId: string;
  onSendGift: (giftId: string, quantity: number) => Promise<void>;
  userBalance: number;
};

export function GiftSelector({ streamId, onSendGift, userBalance }: GiftSelectorProps) {
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchGifts();
  }, []);

  const fetchGifts = async () => {
    try {
      const response = await fetch('/api/gifts');
      const data = await response.json();
      setGifts(data.gifts || []);
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-500 bg-gray-500/10';
      case 'rare':
        return 'border-blue-500 bg-blue-500/10';
      case 'epic':
        return 'border-purple-500 bg-purple-500/10';
      case 'legendary':
        return 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
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
      setIsOpen(false);
    } catch (error: any) {
      alert(error.message || 'Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  const totalCost = selectedGift ? selectedGift.coinCost * quantity : 0;

  return (
    <div className="relative">
      {/* Toggle Button */}
      <GlassButton
        variant="gradient"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        shimmer
        glow
      >
        <span className="text-xl mr-2">🎁</span>
        Send Gift
      </GlassButton>

      {/* Gift Selector Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 bottom-4 md:inset-x-auto md:right-4 md:bottom-4 md:w-[400px] bg-black/90 backdrop-blur-xl rounded-2xl border-2 border-white/20 z-50 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Send a Gift</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Balance */}
            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="text-sm text-gray-400">Your Balance</div>
              <div className="text-lg font-bold text-digis-cyan">
                {userBalance} coins
              </div>
            </div>

            {/* Gift Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {gifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => setSelectedGift(gift)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedGift?.id === gift.id
                      ? 'border-digis-cyan bg-digis-cyan/20 scale-105'
                      : getRarityColor(gift.rarity)
                  }`}
                >
                  <div className="text-4xl mb-2">{gift.emoji}</div>
                  <div className="text-sm font-semibold text-white mb-1">
                    {gift.name}
                  </div>
                  <div className="text-xs text-digis-cyan font-bold">
                    {gift.coinCost} coins
                  </div>
                  <div className="text-xs text-gray-400 capitalize mt-1">
                    {gift.rarity}
                  </div>
                </button>
              ))}
            </div>

            {/* Quantity Selector */}
            {selectedGift && (
              <div className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="text-sm text-gray-400 mb-2">Quantity</div>
                <div className="flex items-center gap-3">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </GlassButton>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))
                    }
                    className="flex-1 text-center bg-transparent text-white font-bold text-lg focus:outline-none"
                    min="1"
                    max="100"
                  />
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                  >
                    +
                  </GlassButton>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Cost:</span>
                    <span className="font-bold text-digis-cyan text-lg">
                      {totalCost} coins
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Send Button */}
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={handleSendGift}
              disabled={!selectedGift || isSending || totalCost > userBalance}
              className="w-full"
              shimmer
              glow
            >
              {isSending ? (
                'Sending...'
              ) : totalCost > userBalance ? (
                'Insufficient Balance'
              ) : selectedGift ? (
                `Send ${selectedGift.emoji} ${selectedGift.name}`
              ) : (
                'Select a Gift'
              )}
            </GlassButton>

            {totalCost > userBalance && (
              <div className="mt-3 text-center">
                <a
                  href="/wallet"
                  className="text-sm text-digis-pink hover:underline"
                >
                  Purchase more coins →
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
