'use client';

import { useState, useEffect } from 'react';
import type { VirtualGift } from '@/db/schema';

type QuickGiftButtonsProps = {
  streamId: string;
  onSendGift: (giftId: string, quantity: number) => Promise<void>;
  userBalance: number;
};

export function QuickGiftButtons({ streamId, onSendGift, userBalance }: QuickGiftButtonsProps) {
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetchQuickGifts();
  }, []);

  const fetchQuickGifts = async () => {
    try {
      const response = await fetch('/api/gifts');
      const data = await response.json();

      // Get top 3 most affordable gifts for quick access
      const sortedGifts = (data.gifts || []).sort((a: VirtualGift, b: VirtualGift) => a.coinCost - b.coinCost);
      setGifts(sortedGifts.slice(0, 3));
    } catch (error) {
      console.error('Error fetching gifts:', error);
    }
  };

  const handleQuickGift = async (gift: VirtualGift) => {
    if (gift.coinCost > userBalance) {
      alert('Insufficient balance!');
      return;
    }

    setSending(gift.id);
    try {
      await onSendGift(gift.id, 1);
    } catch (error: any) {
      alert(error.message || 'Failed to send gift');
    } finally {
      setSending(null);
    }
  };

  if (gifts.length === 0) return null;

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <h4 className="text-sm font-semibold text-white mb-3">⚡ Quick Gifts</h4>
      <div className="flex gap-2">
        {gifts.map((gift) => (
          <button
            key={gift.id}
            onClick={() => handleQuickGift(gift)}
            disabled={sending === gift.id || gift.coinCost > userBalance}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              gift.coinCost > userBalance
                ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                : 'border-white/10 bg-white/5 hover:border-digis-pink hover:scale-105'
            }`}
            title={`Send ${gift.name} - ${gift.coinCost} coins`}
          >
            <div className="text-3xl mb-1">{gift.emoji}</div>
            <div className="text-xs font-bold text-digis-cyan">{gift.coinCost}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Tap to send instantly
      </p>
    </div>
  );
}
