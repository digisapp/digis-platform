'use client';

import { useEffect, useState } from 'react';

interface TopTipperSpotlightProps {
  username: string;
  amount: number;
  avatarUrl?: string | null;
  onComplete: () => void;
}

export function TopTipperSpotlight({ username, amount, avatarUrl, onComplete }: TopTipperSpotlightProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Determine tier based on amount
  const isMega = amount >= 1000; // 1000+ coins = MEGA tip
  const isSuper = amount >= 500 && amount < 1000; // 500-999 = super tip
  const isLarge = amount >= 100 && amount < 500; // 100-499 = large tip

  // Display duration scales with tip value
  const displayDuration = isMega ? 6000 : isSuper ? 5000 : 4000;

  useEffect(() => {
    // Play big tip fanfare sound for top tipper spotlight
    const audio = new Audio('/sounds/big-tip.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [onComplete, displayDuration]);

  if (!isVisible) return null;

  // Dynamic styling based on amount
  const glowColors = isMega
    ? 'from-yellow-400 via-orange-400 to-red-500'
    : isSuper
    ? 'from-purple-500 via-pink-500 to-red-500'
    : 'from-yellow-500 via-orange-500 to-red-500';

  const bgColors = isMega
    ? 'from-yellow-800/95 via-orange-800/95 to-red-900/95'
    : isSuper
    ? 'from-purple-900/95 to-pink-900/95'
    : 'from-yellow-900/95 to-orange-900/95';

  const borderColor = isMega ? 'border-yellow-300' : isSuper ? 'border-purple-400' : 'border-yellow-400';
  const accentColor = isMega ? 'text-yellow-200' : isSuper ? 'text-purple-300' : 'text-yellow-300';
  const amountColor = isMega ? 'text-yellow-300' : isSuper ? 'text-purple-300' : 'text-yellow-400';

  const tierLabel = isMega ? '🔥 MEGA TIP! 🔥' : isSuper ? '💎 SUPER TIP!' : '🌟 Top Supporter!';
  const cardWidth = isMega ? 'w-96' : isSuper ? 'w-88' : 'w-80';
  const amountSize = isMega ? 'text-5xl' : isSuper ? 'text-4xl' : 'text-3xl';
  const scale = isMega ? 'scale-110' : isSuper ? 'scale-105' : '';

  return (
    <div className={`fixed top-24 right-4 z-50 animate-slideInRight ${scale}`}>
      {/* Glow effect - bigger for mega tips */}
      <div className={`absolute inset-0 bg-gradient-to-r ${glowColors} rounded-2xl ${isMega ? 'blur-3xl' : 'blur-2xl'} ${isMega ? 'opacity-80' : 'opacity-60'} animate-pulse`} />

      {/* Extra glow rings for mega tips */}
      {isMega && (
        <>
          <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 rounded-3xl blur-xl opacity-40 animate-pulse" />
          <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500 to-red-500 rounded-3xl blur-2xl opacity-20 animate-ping" />
        </>
      )}

      {/* Card */}
      <div className={`relative backdrop-blur-xl bg-gradient-to-br ${bgColors} rounded-2xl border-2 ${borderColor} shadow-2xl p-6 ${cardWidth} animate-scaleIn`}>
        {/* Mega tip badge */}
        {isMega && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white text-sm font-bold rounded-full shadow-lg animate-bounce whitespace-nowrap">
            💰 LEGENDARY TIP! 💰
          </div>
        )}

        {/* Header */}
        <div className={`flex items-center gap-3 ${isMega ? 'mb-5 mt-2' : 'mb-4'}`}>
          <div className="relative">
            {/* Avatar glow */}
            <div className={`absolute inset-0 ${isMega ? 'bg-yellow-300' : 'bg-yellow-400'} rounded-full ${isMega ? 'blur-lg' : 'blur-md'} animate-ping`} />

            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className={`relative ${isMega ? 'w-20 h-20' : 'w-16 h-16'} rounded-full border-2 ${borderColor} object-cover`}
              />
            ) : (
              <div className={`relative ${isMega ? 'w-20 h-20' : 'w-16 h-16'} rounded-full border-2 ${borderColor} bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center`}>
                <span className={`${isMega ? 'text-3xl' : 'text-2xl'} font-bold text-white`}>
                  {username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}

            {/* Crown icon - bigger for mega */}
            <div className={`absolute ${isMega ? '-top-3 -right-3' : '-top-2 -right-2'} animate-bounce`}>
              <svg className={`${isMega ? 'w-10 h-10' : 'w-8 h-8'} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <div className={`text-xs font-semibold ${accentColor} uppercase tracking-wide mb-1`}>
              {tierLabel}
            </div>
            <div className={`${isMega ? 'text-2xl' : 'text-xl'} font-bold text-white truncate`}>
              {username}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className={`text-center ${isMega ? 'py-4' : 'py-3'} bg-black/30 rounded-xl border ${borderColor}/30`}>
          <div className={`text-sm ${accentColor} mb-1`}>Just Tipped</div>
          <div className={`${amountSize} font-bold ${amountColor} animate-pulse ${isMega ? 'drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]' : ''}`}>
            {amount.toLocaleString()} <span className={`${isMega ? 'text-3xl' : 'text-2xl'}`}>coins</span>
          </div>
        </div>

        {/* Thank you message */}
        <div className="mt-3 text-center">
          <p className={`text-sm ${isMega ? 'text-yellow-100' : isSuper ? 'text-purple-200' : 'text-yellow-200'} font-semibold`}>
            {isMega ? "You're absolutely incredible! 🎉🙏🎉" : isSuper ? "Wow, thank you so much! 🙏✨" : "Thank you for your amazing support! 🙏"}
          </p>
        </div>

        {/* Sparkle effects - more for mega */}
        <div className="absolute -top-2 -left-2 text-2xl animate-pulse">💫</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>💫</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl animate-bounce">⭐</div>
        {isMega && (
          <>
            <div className="absolute top-1/2 -left-4 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🔥</div>
            <div className="absolute top-1/2 -right-4 text-3xl animate-bounce" style={{ animationDelay: '0.7s' }}>🔥</div>
          </>
        )}
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
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
          }
          to {
            transform: scale(1);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out 0.2s backwards;
        }
      `}</style>
    </div>
  );
}
