'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const logoSizes = {
    sm: { width: 40, height: 13 },
    md: { width: 60, height: 20 },
    lg: { width: 80, height: 27 },
  };

  return (
    <div className={`animate-breathe ${className}`}>
      <Image
        src="/images/digis-logo-black.png"
        alt="Loading"
        width={logoSizes[size].width}
        height={logoSizes[size].height}
        className="w-auto h-auto"
      />
      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.95);
          }
        }

        .animate-breathe {
          animation: breathe 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
