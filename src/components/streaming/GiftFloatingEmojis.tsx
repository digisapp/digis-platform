'use client';

import { useState, useEffect, useRef } from 'react';

type FloatingGift = {
  id: string;
  emoji: string;
  x: number;
  delay: number;
  scale: number;
};

type GiftFloatingEmojisProps = {
  gifts: Array<{ id: string; emoji: string; rarity: string; timestamp: number }>;
  onComplete?: (id: string) => void;
};

// Sound files for different gift rarities (using existing sound files)
// Each rarity has a unique sound file with different length/intensity
const GIFT_SOUNDS: Record<string, string> = {
  common: '/sounds/gift-small.wav',      // ~0.5s - simple chime
  rare: '/sounds/gift-medium.wav',        // ~1.0s - coin jingle
  epic: '/sounds/gift-large.wav',         // ~1.5s - bigger coin cascade
  legendary: '/sounds/gift-epic.wav',     // ~2.0s - full jackpot celebration
  tip: '/sounds/big-tip.wav',             // coin jingling for tips
};

// Gift burst counts and sizes by rarity
const RARITY_CONFIG: Record<string, { burstCount: number; baseScale: number; glowColor: string }> = {
  common: { burstCount: 3, baseScale: 1, glowColor: 'rgba(156, 163, 175, 0.5)' },
  rare: { burstCount: 5, baseScale: 1.2, glowColor: 'rgba(59, 130, 246, 0.6)' },
  epic: { burstCount: 8, baseScale: 1.4, glowColor: 'rgba(168, 85, 247, 0.7)' },
  legendary: { burstCount: 12, baseScale: 1.6, glowColor: 'rgba(234, 179, 8, 0.8)' },
  tip: { burstCount: 6, baseScale: 1.3, glowColor: 'rgba(34, 197, 94, 0.7)' },
};

export function GiftFloatingEmojis({ gifts, onComplete }: GiftFloatingEmojisProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingGift[]>([]);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const processedGifts = useRef<Set<string>>(new Set());

  // Preload audio files
  useEffect(() => {
    Object.entries(GIFT_SOUNDS).forEach(([rarity, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioRefs.current.set(rarity, audio);
    });

    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Maximum sound duration (5 seconds)
  const MAX_SOUND_DURATION = 5000;

  // Volume levels by rarity (user wants different intensities)
  const VOLUME_LEVELS: Record<string, number> = {
    common: 0.25,
    rare: 0.35,
    epic: 0.45,
    legendary: 0.55,
    tip: 0.4,
  };

  // Play sound for a rarity - creates fresh audio to ensure correct file plays
  const playSound = (rarity: string) => {
    // Use the rarity if it exists in sounds, otherwise fallback to common
    const soundKey = GIFT_SOUNDS[rarity] ? rarity : 'common';
    const soundSrc = GIFT_SOUNDS[soundKey];

    // Create fresh audio element each time for correct sound
    const audio = new Audio(soundSrc);
    audio.volume = VOLUME_LEVELS[soundKey] || 0.3;

    // Play the sound
    audio.play().catch(() => {
      // Audio play failed - likely no user interaction yet
    });

    // Force stop after max duration (5 seconds)
    const timeout = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }, MAX_SOUND_DURATION);

    // Also stop when naturally ended
    audio.onended = () => {
      clearTimeout(timeout);
      audio.src = '';
    };
  };

  useEffect(() => {
    gifts.forEach(gift => {
      // Skip if already processed
      if (processedGifts.current.has(gift.id)) return;
      processedGifts.current.add(gift.id);

      const config = RARITY_CONFIG[gift.rarity] || RARITY_CONFIG.common;
      const newEmojis: FloatingGift[] = [];

      // Play sound
      playSound(gift.rarity);

      // Create burst of floating emojis
      for (let i = 0; i < config.burstCount; i++) {
        newEmojis.push({
          id: `${gift.id}-${i}`,
          emoji: gift.emoji,
          x: 15 + Math.random() * 70,
          delay: i * 80,
          scale: config.baseScale * (0.8 + Math.random() * 0.4),
        });
      }

      setFloatingEmojis(prev => [...prev, ...newEmojis]);

      // Remove after animation completes
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => !e.id.startsWith(gift.id)));
        onComplete?.(gift.id);
        processedGifts.current.delete(gift.id);
      }, 3500);
    });
  }, [gifts, onComplete]);

  if (floatingEmojis.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {floatingEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute animate-gift-float"
          style={{
            left: `${emoji.x}%`,
            bottom: '-50px',
            animationDelay: `${emoji.delay}ms`,
            fontSize: `${3 * emoji.scale}rem`,
            filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.6))',
          }}
        >
          {emoji.emoji}
        </div>
      ))}
      <style jsx>{`
        @keyframes gift-float {
          0% {
            transform: translateY(0) scale(0.3) rotate(-15deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-5vh) scale(1.3) rotate(10deg);
          }
          30% {
            transform: translateY(-25vh) scale(1.1) rotate(-8deg);
          }
          60% {
            opacity: 1;
            transform: translateY(-55vh) scale(1) rotate(5deg);
          }
          100% {
            transform: translateY(-110vh) scale(0.7) rotate(-10deg);
            opacity: 0;
          }
        }
        .animate-gift-float {
          animation: gift-float 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
