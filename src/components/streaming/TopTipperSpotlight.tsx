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

  useEffect(() => {
    // Play spotlight sound
    const audio = new Audio('/sounds/big-tip.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {
      // Silently fail if audio doesn't play
    });

    // Hide after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-24 right-4 z-50 animate-slideInRight">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl blur-2xl opacity-60 animate-pulse" />

      {/* Card */}
      <div className="relative backdrop-blur-xl bg-gradient-to-br from-yellow-900/95 to-orange-900/95 rounded-2xl border-2 border-yellow-400 shadow-2xl p-6 w-80 animate-scaleIn">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {/* Avatar glow */}
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md animate-ping" />

            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="relative w-16 h-16 rounded-full border-2 border-yellow-400 object-cover"
              />
            ) : (
              <div className="relative w-16 h-16 rounded-full border-2 border-yellow-400 bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {username[0]?.toUpperCase()}
                </span>
              </div>
            )}

            {/* Crown icon */}
            <div className="absolute -top-2 -right-2 animate-bounce">
              <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs font-semibold text-yellow-300 uppercase tracking-wide mb-1">
              🌟 Top Supporter!
            </div>
            <div className="text-xl font-bold text-white truncate">
              {username}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center py-3 bg-black/30 rounded-xl border border-yellow-400/30">
          <div className="text-sm text-yellow-300 mb-1">Just Tipped</div>
          <div className="text-3xl font-bold text-yellow-400 animate-pulse">
            {amount} <span className="text-2xl">coins</span>
          </div>
        </div>

        {/* Thank you message */}
        <div className="mt-3 text-center">
          <p className="text-sm text-yellow-200 font-semibold">
            Thank you for your amazing support! 🙏
          </p>
        </div>

        {/* Sparkle effects */}
        <div className="absolute -top-2 -left-2 text-2xl animate-pulse">💫</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>💫</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl animate-bounce">⭐</div>
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
