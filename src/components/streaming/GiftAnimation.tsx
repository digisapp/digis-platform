'use client';

import { useEffect, useState, useRef, memo } from 'react';
import type { VirtualGift, StreamGift } from '@/db/schema';

type GiftFeedItemProps = {
  gift: VirtualGift;
  streamGift: StreamGift;
  index: number;
  style?: React.CSSProperties;
  onComplete: () => void;
};

// Individual gift item in the feed - memoized to prevent re-renders when sibling gifts change
const GiftFeedItem = memo(function GiftFeedItem({ gift, streamGift, index, style, onComplete }: GiftFeedItemProps) {
  const [state, setState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const totalValue = gift.coinCost * (streamGift.quantity || 1);

  // Determine visual tier based on total coin value
  const isLegendary = totalValue >= 1000; // 1000+ coins = legendary treatment
  const isEpic = totalValue >= 500 && totalValue < 1000; // 500-999 = epic
  const isRare = totalValue >= 100 && totalValue < 500; // 100-499 = rare

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setState('visible'), 50);

    // Display duration based on value (higher value = longer display)
    const displayDuration = isLegendary ? 6000 :
                           isEpic ? 5000 :
                           isRare ? 4000 : 3000;

    const exitTimer = setTimeout(() => setState('exiting'), displayDuration);

    // Remove after exit animation
    const removeTimer = setTimeout(onComplete, displayDuration + 400);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [isLegendary, isEpic, isRare, onComplete]);

  // Get styles based on VALUE not just rarity
  const getValueStyles = () => {
    if (isLegendary) {
      return 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-red-500/30 shadow-[0_0_30px_rgba(234,179,8,0.6),0_0_60px_rgba(234,179,8,0.3)]';
    }
    if (isEpic) {
      return 'border-2 border-purple-400 bg-gradient-to-r from-purple-500/25 to-pink-500/25 shadow-[0_0_20px_rgba(168,85,247,0.5)]';
    }
    if (isRare) {
      return 'border border-blue-400/60 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    }
    return 'border border-white/20 bg-black/80 shadow-[0_0_10px_rgba(0,0,0,0.3)]';
  };

  // Size scaling based on value
  const sizeClass = isLegendary ? 'scale-110' : isEpic ? 'scale-105' : '';
  const emojiSize = isLegendary ? 'text-5xl' : isEpic ? 'text-4xl' : 'text-3xl';
  const coinTextSize = isLegendary ? 'text-xl' : isEpic ? 'text-lg' : 'text-sm';

  return (
    <div
      className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md
        transition-all duration-300 ease-out
        ${getValueStyles()}
        ${sizeClass}
        ${state === 'entering' ? 'translate-x-[100%] opacity-0' : ''}
        ${state === 'visible' ? 'translate-x-0 opacity-100' : ''}
        ${state === 'exiting' ? 'translate-x-[50%] opacity-0 scale-95' : ''}
      `}
      style={style}
    >
      {/* Legendary pulsing glow effect */}
      {isLegendary && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 animate-pulse" />
      )}

      {/* Gift emoji with animations based on value */}
      <div className={`relative ${emojiSize} ${isLegendary ? 'animate-bounce' : isEpic ? 'animate-pulse' : ''}`}>
        {gift.emoji}
        {isLegendary && (
          <div className="absolute -top-1 -right-1 text-sm">👑</div>
        )}
      </div>

      {/* Gift info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2">
          <span className={`font-bold truncate ${isLegendary ? 'text-yellow-300' : isEpic ? 'text-purple-300' : 'text-cyan-400'}`}>
            {streamGift.senderUsername}
          </span>
          {isLegendary && <span className="text-yellow-400 animate-pulse">🔥</span>}
          {isEpic && <span className="text-purple-400">✨</span>}
        </div>
        <div className="text-sm text-white/80">
          sent {streamGift.quantity > 1 ? `${streamGift.quantity}x ` : ''}<span className="font-medium">{gift.name}</span>
          {streamGift.recipientUsername && (
            <span className="text-yellow-400"> to @{streamGift.recipientUsername}</span>
          )}
        </div>
      </div>

      {/* Coin amount - much larger for high value */}
      <div className="text-right relative z-10">
        <div className={`font-bold ${coinTextSize} ${isLegendary ? 'text-yellow-300 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]' : isEpic ? 'text-purple-300' : 'text-yellow-400'}`}>
          {totalValue.toLocaleString()}
        </div>
        <div className="text-xs text-white/50">coins</div>
      </div>

      {/* Value tier badge for high value gifts */}
      {isLegendary && (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
          MEGA GIFT!
        </div>
      )}
      {isEpic && !isLegendary && (
        <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
          EPIC!
        </div>
      )}
    </div>
  );
});

// Container to manage multiple gift animations as a feed
type GiftAnimationManagerProps = {
  gifts: Array<{ gift: VirtualGift; streamGift: StreamGift }>;
  onRemove: (index: number) => void;
};

const MAX_VISIBLE_GIFTS = 4;

// Calculate total coin value for a gift
const getGiftValue = (item: { gift: VirtualGift; streamGift: StreamGift }) => {
  return item.gift.coinCost * (item.streamGift.quantity || 1);
};

export function GiftAnimationManager({ gifts, onRemove }: GiftAnimationManagerProps) {
  // Sort by value (highest first) so bigger gifts always appear on top
  // Then take the most valuable gifts to display
  const sortedGifts = [...gifts].sort((a, b) => getGiftValue(b) - getGiftValue(a));
  const visibleGifts = sortedGifts.slice(0, MAX_VISIBLE_GIFTS);

  if (visibleGifts.length === 0) return null;

  return (
    // Position in top-left to avoid blocking chat on right side
    // Uses pointer-events-none so it doesn't block interaction
    <div className="fixed left-4 top-32 z-30 flex flex-col gap-2 w-64 sm:w-72 pointer-events-none lg:left-auto lg:right-[420px] lg:top-24">
      {visibleGifts.map((item, index) => {
        const value = getGiftValue(item);
        // Higher value gifts get higher z-index to always be on top
        const zIndex = Math.min(100 + Math.floor(value / 100), 200);

        return (
          <GiftFeedItem
            key={`${item.streamGift.id}-${index}`}
            gift={item.gift}
            streamGift={item.streamGift}
            index={index}
            style={{ zIndex }}
            onComplete={() => {
              // Find the actual index in the full array
              const actualIndex = gifts.findIndex(g => g.streamGift.id === item.streamGift.id);
              if (actualIndex !== -1) {
                onRemove(actualIndex);
              }
            }}
          />
        );
      })}
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
