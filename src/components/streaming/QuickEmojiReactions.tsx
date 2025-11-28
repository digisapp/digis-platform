'use client';

import { useState, useCallback } from 'react';

type QuickEmojiReactionsProps = {
  streamId: string;
  onReaction: (emoji: string) => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
};

const REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '💀', label: 'Dead' },
];

export function QuickEmojiReactions({ streamId, onReaction, disabled, variant = 'default' }: QuickEmojiReactionsProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const [animating, setAnimating] = useState<Record<string, boolean>>({});

  const handleReaction = useCallback((emoji: string) => {
    if (disabled || cooldowns[emoji]) return;

    // Cooldown per emoji (500ms)
    setCooldowns(prev => ({ ...prev, [emoji]: true }));
    setAnimating(prev => ({ ...prev, [emoji]: true }));

    setTimeout(() => {
      setCooldowns(prev => ({ ...prev, [emoji]: false }));
    }, 500);

    setTimeout(() => {
      setAnimating(prev => ({ ...prev, [emoji]: false }));
    }, 300);

    onReaction(emoji);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [disabled, cooldowns, onReaction]);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {REACTION_EMOJIS.slice(0, 4).map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            disabled={disabled || cooldowns[emoji]}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-base
              transition-all duration-150 touch-manipulation
              bg-white/10 hover:bg-white/20
              ${animating[emoji] ? 'scale-150 -translate-y-2' : ''}
              ${cooldowns[emoji] ? 'opacity-50' : ''}
            `}
            title={label}
            aria-label={`React with ${label}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
      {REACTION_EMOJIS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          disabled={disabled || cooldowns[emoji]}
          className={`
            relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl
            transition-all duration-200 touch-manipulation
            ${cooldowns[emoji]
              ? 'scale-75 opacity-50'
              : 'hover:scale-125 hover:bg-white/20 active:scale-90'
            }
            ${animating[emoji] ? 'animate-bounce' : ''}
          `}
          title={label}
          aria-label={`React with ${label}`}
        >
          <span className={`transition-transform ${animating[emoji] ? 'scale-150' : ''}`}>
            {emoji}
          </span>
          {/* Ripple effect on click */}
          {animating[emoji] && (
            <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          )}
        </button>
      ))}
    </div>
  );
}

export { REACTION_EMOJIS };
