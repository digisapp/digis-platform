'use client';

import { useEffect, useState } from 'react';

interface AnimatedIconProps {
  size?: number;
  className?: string;
}

export function AnimatedLiveIcon({ size = 80, className = '' }: AnimatedIconProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Pulsing background */}
      <div
        className={`absolute rounded-full bg-gradient-to-br from-digis-pink via-digis-purple to-digis-cyan transition-all duration-1000 ${
          pulse ? 'scale-125 opacity-30' : 'scale-100 opacity-20'
        }`}
        style={{ width: size, height: size }}
      />

      {/* Main icon */}
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="videoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B9D">
              <animate
                attributeName="stopColor"
                values="#FF6B9D; #C084FC; #22D3EE; #FF6B9D"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#22D3EE">
              <animate
                attributeName="stopColor"
                values="#22D3EE; #FF6B9D; #C084FC; #22D3EE"
                dur="3s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>

        {/* Video camera icon */}
        <path
          d="M17 10.5V7C17 6.46957 16.7893 5.96086 16.4142 5.58579C16.0391 5.21071 15.5304 5 15 5H4C3.46957 5 2.96086 5.21071 2.58579 5.58579C2.21071 5.96086 2 6.46957 2 7V17C2 17.5304 2.21071 18.0391 2.58579 18.4142C2.96086 18.7893 3.46957 19 4 19H15C15.5304 19 16.0391 18.7893 16.4142 18.4142C16.7893 18.0391 17 17.5304 17 17V13.5L22 18V6L17 10.5Z"
          fill="url(#videoGradient)"
          stroke="url(#videoGradient)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Record dot */}
        <circle
          cx="7"
          cy="12"
          r="2"
          fill="#FF6B9D"
          className={`transition-opacity duration-500 ${pulse ? 'opacity-100' : 'opacity-40'}`}
        />
      </svg>

      {/* LIVE badge */}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-digis-pink px-2 py-1 rounded-full shadow-lg">
        <div className="flex items-center space-x-1">
          <div
            className={`w-2 h-2 bg-white rounded-full transition-all duration-300 ${
              pulse ? 'scale-125' : 'scale-100'
            }`}
          />
          <span className="text-[10px] font-bold text-white">LIVE</span>
        </div>
      </div>
    </div>
  );
}
