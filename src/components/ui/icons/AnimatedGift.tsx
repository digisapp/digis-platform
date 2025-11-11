import React from 'react';

interface AnimatedGiftProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const AnimatedGift: React.FC<AnimatedGiftProps> = ({
  size = 40,
  className = '',
  animated = true
}) => {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={animated ? 'animate-bounce-subtle' : ''}
        style={{ width: size, height: size }}
      >
        {/* Gift box body */}
        <rect
          x="8"
          y="16"
          width="24"
          height="18"
          rx="2"
          fill="url(#giftGradient)"
          className="drop-shadow-lg"
        />

        {/* Ribbon vertical */}
        <rect
          x="18"
          y="16"
          width="4"
          height="18"
          fill="#ec4899"
          className="drop-shadow-md"
        />

        {/* Gift box top/lid */}
        <rect
          x="6"
          y="12"
          width="28"
          height="5"
          rx="1"
          fill="url(#lidGradient)"
          className="drop-shadow-lg"
        />

        {/* Ribbon horizontal on lid */}
        <rect
          x="6"
          y="14"
          width="28"
          height="2"
          fill="#ec4899"
        />

        {/* Bow */}
        <circle
          cx="20"
          cy="10"
          r="3"
          fill="#f472b6"
          className={animated ? 'animate-pulse' : ''}
        />
        <ellipse
          cx="16"
          cy="10"
          rx="4"
          ry="3"
          fill="#ec4899"
          className={animated ? 'animate-pulse' : ''}
        />
        <ellipse
          cx="24"
          cy="10"
          rx="4"
          ry="3"
          fill="#ec4899"
          className={animated ? 'animate-pulse' : ''}
        />

        {/* Sparkles */}
        {animated && (
          <>
            <circle cx="10" cy="8" r="1" fill="#fbbf24" className="animate-ping" />
            <circle cx="30" cy="12" r="1.5" fill="#fbbf24" className="animate-ping" style={{ animationDelay: '0.3s' }} />
            <circle cx="12" cy="30" r="1" fill="#fbbf24" className="animate-ping" style={{ animationDelay: '0.6s' }} />
          </>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="giftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="lidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9a8d4" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>

      <style jsx>{`
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
