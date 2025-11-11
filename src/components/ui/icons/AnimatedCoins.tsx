import React from 'react';

interface AnimatedCoinsProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const AnimatedCoins: React.FC<AnimatedCoinsProps> = ({
  size = 40,
  className = '',
  animated = true
}) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow effect */}
      {animated && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-xl opacity-60 animate-pulse" />
      )}

      {/* Main coin */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative drop-shadow-2xl ${animated ? 'animate-float' : ''}`}
        style={{ width: size, height: size }}
      >
        {/* Outer circle - gradient */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="url(#coinGradient)"
          className="drop-shadow-lg"
        />

        {/* Inner circle - lighter */}
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="url(#coinInnerGradient)"
          opacity="0.9"
        />

        {/* Coin symbol - D for Digis */}
        <text
          x="20"
          y="26"
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fill="white"
          className="drop-shadow-md"
        >
          D
        </text>

        {/* Shine effect */}
        <circle
          cx="14"
          cy="14"
          r="4"
          fill="white"
          opacity="0.3"
          className={animated ? 'animate-pulse' : ''}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="coinInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>

      {/* Sparkle effects */}
      {animated && (
        <>
          <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
          <div className="absolute bottom-2 left-0 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
        </>
      )}

      {/* Add floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-3px) rotate(2deg);
          }
          75% {
            transform: translateY(3px) rotate(-2deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
