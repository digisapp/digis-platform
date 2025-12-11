'use client';

import { useEffect, useState, useMemo } from 'react';
import type { VirtualGift, StreamGift } from '@/db/schema';

interface GiftAlertProps {
  gift: VirtualGift;
  streamGift: StreamGift;
  senderUsername: string;
  onComplete: () => void;
}

export function GiftAlert({ gift, streamGift, senderUsername, onComplete }: GiftAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Calculate total value and display duration
  const totalValue = gift.coinCost * (streamGift.quantity || 1);

  // Duration scales with gift value:
  // < 100 coins: 2.5 seconds
  // 100-499 coins: 3.5 seconds
  // 500-999 coins: 5 seconds
  // 1000-4999 coins: 7 seconds
  // 5000+ coins: 10 seconds (MEGA gifts)
  const displayDuration = useMemo(() => {
    if (totalValue >= 5000) return 10000;
    if (totalValue >= 1000) return 7000;
    if (totalValue >= 500) return 5000;
    if (totalValue >= 100) return 3500;
    return 2500;
  }, [totalValue]);

  useEffect(() => {
    // Note: Sound is handled by GiftFloatingEmojis to prevent multiple overlapping sounds

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [displayDuration, onComplete]);

  if (!isVisible) return null;

  // Determine alert style based on gift value
  const isMega = totalValue >= 5000;
  const isEpic = totalValue >= 1000;
  const isLarge = totalValue >= 500;
  const isMedium = totalValue >= 100;

  const borderColor = isMega
    ? 'border-yellow-400'
    : isEpic
    ? 'border-purple-500'
    : isLarge
    ? 'border-pink-500'
    : isMedium
    ? 'border-yellow-500'
    : 'border-cyan-500';

  const glowColor = isMega
    ? 'from-yellow-400 via-orange-500 to-red-500'
    : isEpic
    ? 'from-purple-500 to-pink-500'
    : isLarge
    ? 'from-pink-500 to-red-500'
    : isMedium
    ? 'from-yellow-500 to-orange-500'
    : 'from-cyan-500 to-blue-500';

  const textColor = isMega
    ? 'text-yellow-300'
    : isEpic
    ? 'text-purple-400'
    : isLarge
    ? 'text-pink-400'
    : isMedium
    ? 'text-yellow-400'
    : 'text-cyan-400';

  // Convert duration to seconds for CSS animation
  const durationSeconds = displayDuration / 1000;

  return (
    <div className={`fixed bottom-24 right-4 z-50 animate-slideInRight max-w-[calc(100vw-2rem)] ${isMega ? 'scale-110' : ''}`}>
      {/* Glow effect - bigger for mega gifts */}
      <div className={`absolute inset-0 bg-gradient-to-r ${glowColor} rounded-xl ${isMega ? 'blur-3xl opacity-70' : 'blur-xl opacity-50'} animate-pulse`} />

      {/* Extra glow rings for mega gifts */}
      {isMega && (
        <>
          <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
          <div className="absolute -inset-6 bg-gradient-to-r from-yellow-500 to-red-500 rounded-2xl blur-2xl opacity-20 animate-ping" />
        </>
      )}

      {/* Alert Card */}
      <div className={`relative backdrop-blur-xl bg-slate-900/95 rounded-xl border-2 ${borderColor} shadow-2xl p-4 ${isMega ? 'w-96 sm:w-[28rem]' : 'w-80 sm:w-96'} animate-bounceIn`}>
        {/* MEGA badge */}
        {isMega && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white text-sm font-bold rounded-full shadow-lg animate-bounce whitespace-nowrap">
            🔥 MEGA GIFT! 🔥
          </div>
        )}

        <div className={`flex items-center gap-4 ${isMega ? 'mt-2' : ''}`}>
          {/* Gift Icon/Emoji */}
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-r ${glowColor} rounded-full blur-md ${isMega ? 'animate-ping' : ''}`} />
            <div className={`relative ${isMega ? 'text-6xl' : 'text-5xl'} ${isMega ? 'animate-spin-slow' : isEpic ? 'animate-spin-slow' : 'animate-bounce'}`}>
              {gift.emoji}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-white font-bold ${isMega ? 'text-xl' : 'text-lg'} truncate max-w-[150px]`}>
                {senderUsername}
              </span>
              {isMega ? (
                <span className="text-xs px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-bold animate-pulse">
                  LEGENDARY!
                </span>
              ) : isEpic && (
                <span className="text-xs px-2 py-1 bg-purple-500 text-white rounded-full font-bold animate-pulse">
                  EPIC!
                </span>
              )}
            </div>
            <div className="text-gray-300 text-sm mb-2">
              sent {streamGift.quantity > 1 ? `${streamGift.quantity}x ` : ''}<span className="font-semibold">{gift.name}</span>
            </div>
            <div className={`${textColor} font-bold ${isMega ? 'text-2xl' : 'text-xl'} ${isMega ? 'drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]' : ''}`}>
              {totalValue.toLocaleString()} coins
            </div>
          </div>

          {/* Multiplier badge */}
          {streamGift.quantity > 1 && (
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm px-3 py-1 rounded-full border-2 border-white shadow-lg animate-bounce">
              x{streamGift.quantity}
            </div>
          )}
        </div>

        {/* Progress bar animation - uses dynamic duration */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${glowColor}`}
            style={{ animation: `shrink ${durationSeconds}s linear forwards` }}
          />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
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
        .animate-slideInRight {
          animation: slideInRight 0.4s ease-out;
        }
        .animate-bounceIn {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        /* shrink animation is applied via inline style with dynamic duration */
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
