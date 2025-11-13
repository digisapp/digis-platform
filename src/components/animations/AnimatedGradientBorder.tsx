'use client';

import { ReactNode } from 'react';

interface AnimatedGradientBorderProps {
  children: ReactNode;
  className?: string;
  borderWidth?: number;
  speed?: 'slow' | 'medium' | 'fast';
  gradient?: 'cyan-pink' | 'purple-pink' | 'rainbow' | 'neon';
}

export function AnimatedGradientBorder({
  children,
  className = '',
  borderWidth = 2,
  speed = 'medium',
  gradient = 'cyan-pink',
}: AnimatedGradientBorderProps) {
  const speedDuration = {
    slow: '6s',
    medium: '4s',
    fast: '2s',
  };

  const gradients = {
    'cyan-pink': 'from-digis-cyan via-digis-pink to-digis-purple',
    'purple-pink': 'from-digis-purple via-digis-pink to-digis-cyan',
    'rainbow': 'from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
    'neon': 'from-[#00f5ff] via-[#ff00ff] to-[#00ff88]',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Animated gradient border */}
      <div
        className="absolute -inset-0.5 bg-gradient-to-r opacity-75 blur-sm rounded-2xl animate-gradient-rotate"
        style={{
          backgroundSize: '200% 200%',
          animation: `gradient-rotate ${speedDuration[speed]} ease infinite`,
        }}
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${gradients[gradient]} animate-gradient-xy`} />
      </div>

      {/* Content */}
      <div className="relative">
        {children}
      </div>

      <style jsx>{`
        @keyframes gradient-rotate {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes gradient-xy {
          0%, 100% {
            background-position: 0% 50%;
          }
          25% {
            background-position: 100% 50%;
          }
          50% {
            background-position: 100% 100%;
          }
          75% {
            background-position: 0% 100%;
          }
        }

        .animate-gradient-rotate {
          animation: gradient-rotate ${speedDuration[speed]} ease infinite;
        }

        .animate-gradient-xy {
          animation: gradient-xy ${speedDuration[speed]} ease infinite;
        }
      `}</style>
    </div>
  );
}
