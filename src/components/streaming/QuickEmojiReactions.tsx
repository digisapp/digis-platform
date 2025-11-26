'use client';

import { useState, useCallback } from 'react';

type QuickEmojiReactionsProps = {
  streamId: string;
  onReaction: (emoji: string) => void;
  disabled?: boolean;
};

const REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '💀', label: 'Dead' },
];

export function QuickEmojiReactions({ streamId, onReaction, disabled }: QuickEmojiReactionsProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const [lastTap, setLastTap] = useState<Record<string, number>>({});

  const handleReaction = useCallback((emoji: string) => {
    if (disabled || cooldowns[emoji]) return;

    // Cooldown per emoji (500ms)
    setCooldowns(prev => ({ ...prev, [emoji]: true }));
    setTimeout(() => {
      setCooldowns(prev => ({ ...prev, [emoji]: false }));
    }, 500);

    onReaction(emoji);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [disabled, cooldowns, onReaction]);

  return (
    <div className="flex items-center gap-1.5 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
      {REACTION_EMOJIS.map(({ emoji, label }) => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          disabled={disabled || cooldowns[emoji]}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-xl
            transition-all duration-150 touch-manipulation
            ${cooldowns[emoji]
              ? 'scale-75 opacity-50'
              : 'hover:scale-125 hover:bg-white/10 active:scale-90'
            }
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

export { REACTION_EMOJIS };
