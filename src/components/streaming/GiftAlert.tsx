'use client';

import { useEffect, useState } from 'react';
import type { VirtualGift, StreamGift } from '@/db/schema';

interface GiftAlertProps {
  gift: VirtualGift;
  streamGift: StreamGift;
  senderUsername: string;
  onComplete: () => void;
}

export function GiftAlert({ gift, streamGift, senderUsername, onComplete }: GiftAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play gift sound based on coin value
    let soundFile = '/sounds/gift-small.mp3'; // Default

    if (gift.coinCost >= 1000) {
      soundFile = '/sounds/gift-epic.mp3';
    } else if (gift.coinCost >= 500) {
      soundFile = '/sounds/gift-large.mp3';
    } else if (gift.coinCost >= 100) {
      soundFile = '/sounds/gift-medium.mp3';
    }

    const audio = new Audio(soundFile);
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Silently fail if audio doesn't play
    });

    // Hide after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [gift.coinCost, onComplete]);

  if (!isVisible) return null;

  // Determine alert style based on gift value
  const isEpic = gift.coinCost >= 1000;
  const isLarge = gift.coinCost >= 500;
  const isMedium = gift.coinCost >= 100;

  const borderColor = isEpic
    ? 'border-purple-500'
    : isLarge
    ? 'border-pink-500'
    : isMedium
    ? 'border-yellow-500'
    : 'border-cyan-500';

  const glowColor = isEpic
    ? 'from-purple-500 to-pink-500'
    : isLarge
    ? 'from-pink-500 to-red-500'
    : isMedium
    ? 'from-yellow-500 to-orange-500'
    : 'from-cyan-500 to-blue-500';

  const textColor = isEpic
    ? 'text-purple-400'
    : isLarge
    ? 'text-pink-400'
    : isMedium
    ? 'text-yellow-400'
    : 'text-cyan-400';

  return (
    <div className="fixed bottom-24 left-4 z-50 animate-slideInLeft">
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${glowColor} rounded-xl blur-xl opacity-50 animate-pulse`} />

      {/* Alert Card */}
      <div className={`relative backdrop-blur-xl bg-slate-900/95 rounded-xl border-2 ${borderColor} shadow-2xl p-4 w-96 animate-bounceIn`}>
        <div className="flex items-center gap-4">
          {/* Gift Icon/Emoji */}
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${glowColor} rounded-full blur-md animate-ping`} />
            <div className={`relative text-5xl ${isEpic ? 'animate-spin-slow' : 'animate-bounce'}`}>
              {gift.emoji}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold text-lg truncate max-w-[150px]">
                {senderUsername}
              </span>
              {isEpic && (
                <span className="text-xs px-2 py-1 bg-purple-500 text-white rounded-full font-bold animate-pulse">
                  EPIC!
                </span>
              )}
            </div>
            <div className="text-gray-300 text-sm mb-2">
              sent {streamGift.quantity > 1 ? `${streamGift.quantity}x ` : ''}<span className="font-semibold">{gift.name}</span>
            </div>
            <div className={`${textColor} font-bold text-xl`}>
              {gift.coinCost * streamGift.quantity} coins
            </div>
          </div>

          {/* Multiplier badge */}
          {streamGift.quantity > 1 && (
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm px-3 py-1 rounded-full border-2 border-white shadow-lg animate-bounce">
              x{streamGift.quantity}
            </div>
          )}
        </div>

        {/* Progress bar animation */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${glowColor} animate-shrink`} />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes bounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.4s ease-out;
        }
        .animate-bounceIn {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-shrink {
          animation: shrink 3s linear;
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
