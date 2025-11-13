'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const logoSizes = {
    sm: { width: 30, height: 10 },
    md: { width: 45, height: 15 },
    lg: { width: 60, height: 20 },
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
