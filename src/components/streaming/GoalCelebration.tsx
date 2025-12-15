'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { StreamGoal } from '@/db/schema';

interface GoalCelebrationProps {
  goal: StreamGoal;
  onComplete: () => void;
}

export function GoalCelebration({ goal, onComplete }: GoalCelebrationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasCalledComplete = useRef(false);

  // Memoize onComplete to avoid re-triggering the effect
  const handleComplete = useCallback(() => {
    if (hasCalledComplete.current) return;
    hasCalledComplete.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Play celebration sound once
    const audio = new Audio('/sounds/goal-complete.mp3');
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {
      // Silently fail if audio doesn't play
    });

    // Auto-dismiss after 5 seconds - this is the hard timeout
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Stop audio if still playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Slight delay for fade animation then call complete
      setTimeout(handleComplete, 500);
    }, 5000);

    return () => {
      clearTimeout(timer);
      // Clean up audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [handleComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-fadeIn">
      {/* Confetti Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10%',
              backgroundColor: ['#06b6d4', '#ec4899', '#fbbf24', '#8b5cf6'][Math.floor(Math.random() * 4)],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Celebration Card */}
      <div className="relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-3xl blur-3xl opacity-50 animate-pulse" />

        {/* Card Content */}
        <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/95 to-purple-900/95 rounded-3xl border-2 border-yellow-400 shadow-2xl p-8 max-w-2xl mx-4 animate-scaleIn">
          {/* Trophy Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl animate-ping" />
              <svg className="relative w-24 h-24 text-yellow-400 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-3 animate-slideDown">
              🎉 GOAL UNLOCKED! 🎉
            </h2>
            <h3 className="text-2xl font-bold text-yellow-400 mb-4 animate-slideUp">
              {goal.title}
            </h3>
            <p className="text-xl text-gray-200 mb-4">
              {goal.rewardText}
            </p>
            <div className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full">
              <span className="text-white font-bold text-lg">
                {goal.targetAmount} Coins Reached!
              </span>
            </div>
          </div>

          {/* Sparkles */}
          <div className="absolute top-4 left-4 text-4xl animate-spin-slow">✨</div>
          <div className="absolute top-4 right-4 text-4xl animate-spin-slow" style={{ animationDelay: '0.5s' }}>✨</div>
          <div className="absolute bottom-4 left-8 text-3xl animate-bounce" style={{ animationDelay: '1s' }}>⭐</div>
          <div className="absolute bottom-4 right-8 text-3xl animate-bounce" style={{ animationDelay: '1.5s' }}>⭐</div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
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
        .animate-confetti {
          animation: confetti linear infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }
        .animate-slideDown {
          animation: slideDown 0.6s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out 0.2s backwards;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
