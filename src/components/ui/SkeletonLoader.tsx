interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'video';
}

export function SkeletonLoader({
  className = '',
  variant = 'rectangular'
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-purple-200/50 via-purple-300/50 to-purple-200/50 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    video: 'aspect-video rounded-xl',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-pulse {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

export function VideoPreviewSkeleton() {
  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-purple-200">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-cyan-900/20">
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <SkeletonLoader variant="circular" className="w-16 h-16 mx-auto" />
            <div className="space-y-2">
              <SkeletonLoader variant="text" className="w-32 mx-auto" />
              <SkeletonLoader variant="text" className="w-24 mx-auto" />
            </div>
          </div>
        </div>
      </div>
      {/* Animated scanning line */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-digis-cyan to-transparent animate-scan" />
      </div>
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0%;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
