'use client';

import { useEffect, useState } from 'react';
import { Gift, Heart, Star, Sparkles, Zap } from 'lucide-react';

interface GiftBurstEffectProps {
  giftName?: string;
  giftIcon?: 'gift' | 'heart' | 'star' | 'sparkles' | 'zap';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  triggerKey?: string | number;
  onComplete?: () => void;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  delay: number;
  color: string;
}

export function GiftBurstEffect({
  giftName = 'Gift',
  giftIcon = 'gift',
  rarity = 'common',
  triggerKey,
  onComplete,
}: GiftBurstEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showGift, setShowGift] = useState(false);

  const rarityConfig = {
    common: {
      color: 'text-gray-400',
      glow: 'drop-shadow-[0_0_10px_rgba(156,163,175,0.8)]',
      bg: 'from-gray-400 to-gray-500',
      particleCount: 8,
    },
    rare: {
      color: 'text-blue-400',
      glow: 'drop-shadow-[0_0_15px_rgba(96,165,250,0.9)]',
      bg: 'from-blue-400 to-blue-500',
      particleCount: 12,
    },
    epic: {
      color: 'text-purple-400',
      glow: 'drop-shadow-[0_0_20px_rgba(192,132,252,0.9)]',
      bg: 'from-purple-400 to-purple-600',
      particleCount: 16,
    },
    legendary: {
      color: 'text-amber-400',
      glow: 'drop-shadow-[0_0_25px_rgba(251,191,36,1)]',
      bg: 'from-amber-400 via-orange-500 to-amber-600',
      particleCount: 24,
    },
  };

  const icons = {
    gift: Gift,
    heart: Heart,
    star: Star,
    sparkles: Sparkles,
    zap: Zap,
  };

  const Icon = icons[giftIcon];
  const config = rarityConfig[rarity];

  useEffect(() => {
    if (!triggerKey) return;

    // Generate particle burst
    const colors = rarity === 'legendary'
      ? ['#fbbf24', '#f59e0b', '#fb923c', '#f97316']
      : rarity === 'epic'
      ? ['#c084fc', '#a855f7', '#e879f9', '#d946ef']
      : rarity === 'rare'
      ? ['#60a5fa', '#3b82f6', '#06b6d4', '#0ea5e9']
      : ['#9ca3af', '#6b7280'];

    const newParticles = Array.from({ length: config.particleCount }, (_, i) => {
      const angle = (360 / config.particleCount) * i;
      const distance = 150 + Math.random() * 100;
      const x = Math.cos((angle * Math.PI) / 180) * distance;
      const y = Math.sin((angle * Math.PI) / 180) * distance;

      return {
        id: `particle-${triggerKey}-${i}`,
        x,
        y,
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * 360,
        delay: i * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    setParticles(newParticles);
    setShowGift(true);

    const timer = setTimeout(() => {
      setParticles([]);
      setShowGift(false);
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [triggerKey]);

  if (!showGift) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Burst particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-burst-particle"
          style={{
            left: '50%',
            top: '50%',
            animationDelay: `${particle.delay}ms`,
            '--burst-x': `${particle.x}px`,
            '--burst-y': `${particle.y}px`,
            '--rotation': `${particle.rotation}deg`,
            '--scale': particle.scale,
          } as React.CSSProperties}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: particle.color,
              boxShadow: `0 0 15px ${particle.color}`,
            }}
          />
        </div>
      ))}

      {/* Center gift icon with pulse */}
      <div className="absolute animate-gift-pulse">
        <div className={`p-6 rounded-full bg-gradient-to-br ${config.bg} shadow-2xl`}>
          <Icon
            className={`w-16 h-16 ${config.color} ${config.glow}`}
            strokeWidth={2.5}
          />
        </div>
      </div>

      {/* Gift name banner */}
      <div className="absolute top-1/3 animate-banner-slide">
        <div className={`px-8 py-3 bg-gradient-to-r ${config.bg} rounded-full shadow-2xl border-2 border-white/30`}>
          <span className="text-xl font-bold text-white drop-shadow-lg uppercase tracking-wider">
            {giftName}
          </span>
        </div>
      </div>

      {/* Confetti for legendary */}
      {rarity === 'legendary' && (
        <div className="absolute inset-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 500}ms`,
                '--confetti-x': `${Math.random() * 200 - 100}px`,
              } as React.CSSProperties}
            >
              <div
                className="w-2 h-2"
                style={{
                  backgroundColor: ['#fbbf24', '#f59e0b', '#fb923c', '#f97316'][Math.floor(Math.random() * 4)],
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes burst-particle {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--burst-x), var(--burst-y)) rotate(var(--rotation)) scale(var(--scale));
            opacity: 0;
          }
        }

        @keyframes gift-pulse {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes banner-slide {
          0% {
            transform: translateY(-100px) scale(0.5);
            opacity: 0;
          }
          30% {
            transform: translateY(0) scale(1.1);
            opacity: 1;
          }
          70% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px) scale(0.9);
            opacity: 0;
          }
        }

        @keyframes confetti {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--confetti-x)) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-burst-particle {
          animation: burst-particle 1.5s ease-out forwards;
        }

        .animate-gift-pulse {
          animation: gift-pulse 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-banner-slide {
          animation: banner-slide 2.5s ease-out forwards;
        }

        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Hook for easy usage
export function useGiftBurst() {
  const [trigger, setTrigger] = useState(0);

  const playBurst = () => {
    setTrigger(prev => prev + 1);
  };

  return { trigger, playBurst };
}
