'use client';

import Image from 'next/image';

interface NeonLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'logo';
  text?: string;
  fullScreen?: boolean;
}

export function NeonLoader({
  size = 'md',
  variant = 'logo',
  text,
  fullScreen = false,
}: NeonLoaderProps) {
  const logoWidths = {
    sm: 60,
    md: 90,
    lg: 110,
    xl: 140,
  };

  const logoHeights = {
    sm: 20,
    md: 30,
    lg: 37,
    xl: 47,
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-6 ${fullScreen ? 'min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900' : ''}`}>
      {/* Simple breathing Digis logo */}
      <div className="relative animate-breathe">
        <Image
          src="/images/digis-logo-white.png"
          alt="Digis"
          width={logoWidths[size]}
          height={logoHeights[size]}
          className="w-auto h-auto"
          priority
        />
      </div>

      {text && (
        <p className="text-white font-medium">
          {text}
        </p>
      )}

      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.98);
          }
        }

        .animate-breathe {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  return content;
}

// Skeleton loader with neon glow
export function NeonSkeleton({ className = '', animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-purple-100 to-gray-200 rounded ${
        animate ? 'animate-shimmer' : ''
      } ${className}`}
      style={{
        backgroundSize: '200% 100%',
      }}
    >
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
