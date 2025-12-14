'use client';

import { useState, useEffect, useRef } from 'react';

type FloatingGift = {
  id: string;
  emoji: string;
  x: number;
  delay: number;
  scale: number;
  duration: number;
};

type GiftFloatingEmojisProps = {
  gifts: Array<{ id: string; emoji: string; rarity: string; timestamp: number; giftName?: string }>;
  onComplete?: (id: string) => void;
};

// Gift-specific sounds - unique sound for each gift type
const GIFT_SPECIFIC_SOUNDS: Record<string, string> = {
  // Common gifts
  'Fire': '/sounds/gift-fire.mp3',             // Fire whoosh
  'Heart': '/sounds/gift-heart.mp3',           // Heartbeat/love
  'Peach': '/sounds/gift-peach.mp3',           // Juicy pop
  'Pizza': '/sounds/gift-pizza.mp3',           // Oven ding
  'Rocket': '/sounds/gift-rocket.mp3',         // Rocket whoosh
  'Rose': '/sounds/gift-rose.mp3',             // Romantic chime
  'Martini': '/sounds/gift-martini.mp3',       // Glass clink
  // Rare gifts
  'Cake': '/sounds/gift-cake.mp3',             // Celebration
  'Sushi': '/sounds/gift-sushi.mp3',           // Pleasant pop
  'Steak': '/sounds/gift-steak.mp3',           // Sizzle
  'Champagne': '/sounds/gift-champagne.mp3',   // Cork pop and fizz
  'Gold Bar': '/sounds/gift-money.mp3',        // Coins/jackpot
  'Crown': '/sounds/gift-crown.mp3',           // Royal fanfare
  // Epic gifts
  'Designer Bag': '/sounds/gift-bag.mp3',      // Shopping sound
  'Diamond': '/sounds/gift-diamond.mp3',       // Sparkle/bling
  'Engagement Ring': '/sounds/gift-ring.mp3',  // Magic shimmer
  'Sports Car': '/sounds/gift-sports-car.mp3', // Engine rev
  // Legendary gifts
  'Yacht': '/sounds/gift-yacht.mp3',           // Boat horn
  'Jet': '/sounds/gift-jet.mp3',               // Jet flyby
  'Mansion': '/sounds/gift-mansion.mp3',       // Grand fanfare
};

// Fallback sounds for gifts without specific sounds - based on rarity
const RARITY_SOUNDS: Record<string, string> = {
  common: '/sounds/coin-common.wav',
  rare: '/sounds/coin-rare.wav',
  epic: '/sounds/coin-epic.wav',
  legendary: '/sounds/coin-legendary.wav',
  tip: '/sounds/coin-tip.wav',
};

// Gift burst counts, sizes, and duration by rarity - more hype for bigger gifts!
const RARITY_CONFIG: Record<string, { burstCount: number; baseScale: number; glowColor: string; duration: number }> = {
  common: { burstCount: 4, baseScale: 1, glowColor: 'rgba(156, 163, 175, 0.5)', duration: 5000 },
  rare: { burstCount: 8, baseScale: 1.3, glowColor: 'rgba(59, 130, 246, 0.6)', duration: 6000 },
  epic: { burstCount: 15, baseScale: 1.5, glowColor: 'rgba(168, 85, 247, 0.7)', duration: 8000 },
  legendary: { burstCount: 25, baseScale: 1.8, glowColor: 'rgba(234, 179, 8, 0.8)', duration: 10000 },
  tip: { burstCount: 8, baseScale: 1.3, glowColor: 'rgba(34, 197, 94, 0.7)', duration: 5500 },
};

export function GiftFloatingEmojis({ gifts, onComplete }: GiftFloatingEmojisProps) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingGift[]>([]);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const processedGifts = useRef<Set<string>>(new Set());
  const lastSoundTime = useRef<number>(0);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  // Minimum time between sounds (prevents rapid-fire dinging)
  const SOUND_COOLDOWN = 4000; // 4 seconds between sounds

  // Preload audio files
  useEffect(() => {
    // Preload rarity-based sounds
    Object.entries(RARITY_SOUNDS).forEach(([rarity, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioRefs.current.set(rarity, audio);
    });
    // Preload gift-specific sounds
    Object.entries(GIFT_SPECIFIC_SOUNDS).forEach(([giftName, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = 0.5;
      audioRefs.current.set(giftName, audio);
    });

    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
      if (currentAudio.current) {
        currentAudio.current.pause();
        currentAudio.current = null;
      }
    };
  }, []);

  // Sound duration by rarity (longer for bigger gifts = more hype)
  const SOUND_DURATION: Record<string, number> = {
    common: 2000,
    rare: 3000,
    epic: 4000,
    legendary: 6000,
    tip: 2500,
  };

  // Volume levels by rarity (balanced for impact)
  const VOLUME_LEVELS: Record<string, number> = {
    common: 0.25,
    rare: 0.35,
    epic: 0.45,
    legendary: 0.55,
    tip: 0.3,
  };

  // Play sound for a gift - uses gift-specific sound if available, else falls back to rarity
  const playSound = (rarity: string, giftName?: string) => {
    const now = Date.now();

    // Skip if we played a sound too recently (prevents annoying rapid dinging)
    if (now - lastSoundTime.current < SOUND_COOLDOWN) {
      return;
    }

    // Stop any currently playing sound
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
    }

    lastSoundTime.current = now;

    // Check for gift-specific sound first, then fall back to rarity
    let soundSrc: string;
    let soundKey: string;

    if (giftName && GIFT_SPECIFIC_SOUNDS[giftName]) {
      soundSrc = GIFT_SPECIFIC_SOUNDS[giftName];
      soundKey = rarity; // Use rarity for volume/duration settings
    } else {
      soundKey = RARITY_SOUNDS[rarity] ? rarity : 'common';
      soundSrc = RARITY_SOUNDS[soundKey];
    }

    // Create fresh audio element each time for correct sound
    const audio = new Audio(soundSrc);
    audio.volume = VOLUME_LEVELS[soundKey] || 0.3;
    currentAudio.current = audio;

    // Play the sound
    audio.play().catch(() => {
      // Audio play failed - likely no user interaction yet
    });

    // Force stop after rarity-based duration (longer for bigger gifts)
    const duration = SOUND_DURATION[soundKey] || 2000;
    const timeout = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      if (currentAudio.current === audio) {
        currentAudio.current = null;
      }
    }, duration);

    // Also stop when naturally ended
    audio.onended = () => {
      clearTimeout(timeout);
      audio.src = '';
      if (currentAudio.current === audio) {
        currentAudio.current = null;
      }
    };
  };

  useEffect(() => {
    gifts.forEach(gift => {
      // Skip if already processed
      if (processedGifts.current.has(gift.id)) return;
      processedGifts.current.add(gift.id);

      const config = RARITY_CONFIG[gift.rarity] || RARITY_CONFIG.common;
      const newEmojis: FloatingGift[] = [];

      // Play sound - use gift-specific sound if available
      playSound(gift.rarity, gift.giftName);

      // Create burst of floating emojis
      for (let i = 0; i < config.burstCount; i++) {
        newEmojis.push({
          id: `${gift.id}-${i}`,
          emoji: gift.emoji,
          x: 15 + Math.random() * 70,
          delay: i * 100, // Slightly slower stagger for longer animations
          scale: config.baseScale * (0.8 + Math.random() * 0.4),
          duration: config.duration,
        });
      }

      setFloatingEmojis(prev => [...prev, ...newEmojis]);

      // Remove after animation completes (add buffer for delays)
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => !e.id.startsWith(gift.id)));
        onComplete?.(gift.id);
        processedGifts.current.delete(gift.id);
      }, config.duration + 1000); // Duration + buffer for staggered start
    });
  }, [gifts, onComplete]);

  if (floatingEmojis.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {floatingEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute"
          style={{
            left: `${emoji.x}%`,
            bottom: '-50px',
            animationName: 'gift-float',
            animationDuration: `${emoji.duration}ms`,
            animationTimingFunction: 'ease-out',
            animationFillMode: 'forwards',
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
          8% {
            opacity: 1;
            transform: translateY(-5vh) scale(1.3) rotate(10deg);
          }
          20% {
            transform: translateY(-20vh) scale(1.15) rotate(-8deg);
          }
          40% {
            transform: translateY(-40vh) scale(1.1) rotate(5deg);
          }
          60% {
            opacity: 1;
            transform: translateY(-60vh) scale(1) rotate(-3deg);
          }
          80% {
            opacity: 0.8;
            transform: translateY(-80vh) scale(0.9) rotate(2deg);
          }
          100% {
            transform: translateY(-110vh) scale(0.7) rotate(-5deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
