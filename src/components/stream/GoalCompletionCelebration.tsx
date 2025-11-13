'use client';

import { useEffect, useState } from 'react';
import { Trophy, Sparkles, Star } from 'lucide-react';

interface GoalCompletionCelebrationProps {
  goalTitle: string;
  rewardText: string;
  triggerKey?: string | number;
  onComplete?: () => void;
}

export function GoalCompletionCelebration({
  goalTitle,
  rewardText,
  triggerKey,
  onComplete,
}: GoalCompletionCelebrationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!triggerKey) return;

    setShow(true);

    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [triggerKey]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Confetti rain */}
      <div className="absolute inset-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={`confetti-${i}`}
            className="absolute animate-confetti-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-5%',
              animationDelay: `${Math.random() * 2}s`,
              '--fall-distance': `${100 + Math.random() * 20}vh`,
              '--drift': `${(Math.random() - 0.5) * 200}px`,
            } as React.CSSProperties}
          >
            <div
              className="w-2 h-2 md:w-3 md:h-3 rotate-45"
              style={{
                backgroundColor: [
                  '#00f5ff', // cyan
                  '#ff00ff', // pink
                  '#8b5cf6', // purple
                  '#fbbf24', // amber
                  '#ef4444', // red
                ][Math.floor(Math.random() * 5)],
              }}
            />
          </div>
        ))}
      </div>

      {/* Main celebration card */}
      <div className="animate-celebration-popup">
        <div className="glass border-4 border-amber-400 rounded-3xl p-8 md:p-12 max-w-lg mx-4 text-center relative overflow-hidden">
          {/* Radial gradient background */}
          <div
            className="absolute inset-0 bg-gradient-radial from-amber-400/20 via-transparent to-transparent animate-pulse-glow"
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Trophy icon with glow */}
            <div className="mb-6 flex justify-center">
              <div
                className="relative"
                style={{
                  filter: 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.8))',
                }}
              >
                <Trophy className="w-20 h-20 md:w-24 md:h-24 text-amber-400 animate-bounce-slow" />
                {/* Sparkles around trophy */}
                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-300 animate-spin-slow" />
                <Star className="absolute -bottom-2 -left-2 w-6 h-6 text-amber-500 animate-pulse" />
              </div>
            </div>

            {/* Text */}
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent animate-gradient-x">
              GOAL COMPLETED!
            </h2>

            <p className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
              {goalTitle}
            </p>

            <div className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-digis-cyan to-digis-pink inline-block">
              <p className="text-white font-bold text-lg md:text-xl flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                {rewardText}
              </p>
            </div>
          </div>

          {/* Radial burst lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`burst-${i}`}
              className="absolute top-1/2 left-1/2 w-1 h-20 bg-gradient-to-t from-amber-400/50 to-transparent origin-bottom animate-burst-line"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(var(--fall-distance)) translateX(var(--drift)) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes celebration-popup {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
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

        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes burst-line {
          0% {
            height: 0;
            opacity: 0;
          }
          50% {
            height: 100px;
            opacity: 1;
          }
          100% {
            height: 0;
            opacity: 0;
          }
        }

        .animate-confetti-fall {
          animation: confetti-fall 3s ease-out forwards;
        }

        .animate-celebration-popup {
          animation: celebration-popup 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-gradient-x {
          background-size: 200% 100%;
          animation: gradient-x 3s ease-in-out infinite;
        }

        .animate-burst-line {
          animation: burst-line 1.5s ease-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
