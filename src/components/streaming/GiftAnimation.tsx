'use client';

import { useEffect, useState, useRef } from 'react';
import type { VirtualGift, StreamGift } from '@/db/schema';

type GiftFeedItemProps = {
  gift: VirtualGift;
  streamGift: StreamGift;
  index: number;
  onComplete: () => void;
};

// Individual gift item in the feed
function GiftFeedItem({ gift, streamGift, index, onComplete }: GiftFeedItemProps) {
  const [state, setState] = useState<'entering' | 'visible' | 'exiting'>('entering');

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setState('visible'), 50);

    // Start exit after display duration (longer for higher value gifts)
    const displayDuration = gift.rarity === 'legendary' ? 5000 :
                           gift.rarity === 'epic' ? 4000 :
                           gift.rarity === 'rare' ? 3500 : 3000;

    const exitTimer = setTimeout(() => setState('exiting'), displayDuration);

    // Remove after exit animation
    const removeTimer = setTimeout(onComplete, displayDuration + 400);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [gift.rarity, onComplete]);

  const getRarityStyles = () => {
    switch (gift.rarity) {
      case 'legendary':
        return 'border-yellow-500/60 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
      case 'epic':
        return 'border-purple-500/60 bg-gradient-to-r from-purple-500/20 to-pink-500/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      case 'rare':
        return 'border-blue-500/50 bg-gradient-to-r from-blue-500/15 to-cyan-500/15 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
      default:
        return 'border-white/20 bg-black/80';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-md
        transition-all duration-300 ease-out
        ${getRarityStyles()}
        ${state === 'entering' ? 'translate-x-[-100%] opacity-0' : ''}
        ${state === 'visible' ? 'translate-x-0 opacity-100' : ''}
        ${state === 'exiting' ? 'translate-x-[-50%] opacity-0 scale-95' : ''}
      `}
    >
      {/* Gift emoji with pulse for legendary */}
      <div className={`text-3xl ${gift.rarity === 'legendary' ? 'animate-pulse' : ''}`}>
        {gift.emoji}
      </div>

      {/* Gift info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-cyan-400 truncate">
            {streamGift.senderUsername}
          </span>
          {gift.rarity === 'legendary' && <span className="text-yellow-400">👑</span>}
          {gift.rarity === 'epic' && <span className="text-purple-400">✨</span>}
        </div>
        <div className="text-sm text-white/80">
          sent {streamGift.quantity > 1 ? `${streamGift.quantity}x ` : ''}<span className="font-medium">{gift.name}</span>
        </div>
      </div>

      {/* Coin amount */}
      <div className="text-right">
        <div className="text-sm font-bold text-yellow-400">
          {(gift.coinCost * streamGift.quantity).toLocaleString()}
        </div>
        <div className="text-xs text-white/50">coins</div>
      </div>
    </div>
  );
}

// Container to manage multiple gift animations as a feed
type GiftAnimationManagerProps = {
  gifts: Array<{ gift: VirtualGift; streamGift: StreamGift }>;
  onRemove: (index: number) => void;
};

const MAX_VISIBLE_GIFTS = 4;

export function GiftAnimationManager({ gifts, onRemove }: GiftAnimationManagerProps) {
  // Only show the most recent gifts
  const visibleGifts = gifts.slice(-MAX_VISIBLE_GIFTS);

  if (visibleGifts.length === 0) return null;

  return (
    <div className="fixed left-4 bottom-24 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {visibleGifts.map((item, index) => (
        <GiftFeedItem
          key={`${item.streamGift.id}-${index}`}
          gift={item.gift}
          streamGift={item.streamGift}
          index={index}
          onComplete={() => {
            // Find the actual index in the full array
            const actualIndex = gifts.findIndex(g => g.streamGift.id === item.streamGift.id);
            if (actualIndex !== -1) {
              onRemove(actualIndex);
            }
          }}
        />
      ))}
    </div>
  );
}

// Legacy single gift animation (keeping for backwards compatibility)
type GiftAnimationProps = {
  gift: VirtualGift;
  streamGift: StreamGift;
  onComplete: () => void;
};

export function GiftAnimation({ gift, streamGift, onComplete }: GiftAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return null; // Using the feed-based display instead
}
