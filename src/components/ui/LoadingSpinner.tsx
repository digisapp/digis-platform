'use client';

import Image from 'next/image';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Custom loading message for screen readers */
  label?: string;
}

export function LoadingSpinner({ size = 'md', className = '', label = 'Loading' }: LoadingSpinnerProps) {
  const logoSizes = {
    sm: { width: 30, height: 10 },
    md: { width: 45, height: 15 },
    lg: { width: 60, height: 20 },
  };

  return (
    <div
      className={`animate-breathe ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Image
        src="/images/digis-logo-white.png"
        alt=""
        aria-hidden="true"
        width={logoSizes[size].width}
        height={logoSizes[size].height}
        className="w-auto h-auto drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
      />
      <span className="sr-only">{label}</span>
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
