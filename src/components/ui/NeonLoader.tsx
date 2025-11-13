'use client';

interface NeonLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'logo';
  text?: string;
  fullScreen?: boolean;
}

export function NeonLoader({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
}: NeonLoaderProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-6 h-6',
  };

  const barSizes = {
    sm: 'w-1 h-6',
    md: 'w-1.5 h-8',
    lg: 'w-2 h-12',
    xl: 'w-3 h-16',
  };

  const Container = fullScreen ? 'div' : 'div';

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? 'min-h-screen bg-pastel-gradient' : ''}`}>
      {variant === 'spinner' && (
        <div className={`relative ${sizes[size]}`}>
          <div className="absolute inset-0 rounded-full border-4 border-digis-cyan/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-digis-cyan border-r-digis-pink animate-spin"
               style={{
                 filter: 'drop-shadow(0 0 10px rgba(0, 245, 255, 0.6))',
               }}
          />
        </div>
      )}

      {variant === 'dots' && (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${dotSizes[size]} rounded-full bg-gradient-to-r from-digis-cyan to-digis-pink animate-bounce`}
              style={{
                animationDelay: `${i * 0.15}s`,
                filter: 'drop-shadow(0 0 8px currentColor)',
              }}
            />
          ))}
        </div>
      )}

      {variant === 'pulse' && (
        <div className={`relative ${sizes[size]}`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-digis-cyan to-digis-pink animate-ping opacity-75" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-digis-cyan to-digis-pink"
               style={{
                 filter: 'drop-shadow(0 0 20px rgba(0, 245, 255, 0.8))',
               }}
          />
        </div>
      )}

      {variant === 'bars' && (
        <div className="flex gap-1.5 items-end">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${barSizes[size]} bg-gradient-to-t from-digis-cyan to-digis-pink rounded-full animate-wave`}
              style={{
                animationDelay: `${i * 0.1}s`,
                filter: 'drop-shadow(0 0 8px currentColor)',
              }}
            />
          ))}
        </div>
      )}

      {variant === 'logo' && (
        <div className={`relative ${sizes[size]}`}>
          {/* Animated D letter with neon effect */}
          <div className="text-6xl font-bold bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent animate-pulse-slow"
               style={{
                 filter: 'drop-shadow(0 0 20px rgba(0, 245, 255, 0.6)) drop-shadow(0 0 40px rgba(255, 0, 255, 0.4))',
               }}
          >
            D
          </div>
          {/* Rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-digis-cyan border-r-digis-pink animate-spin"
               style={{
                 filter: 'drop-shadow(0 0 10px currentColor)',
               }}
          />
        </div>
      )}

      {text && (
        <p className="text-gray-700 font-medium animate-pulse">
          {text}
        </p>
      )}

      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
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
