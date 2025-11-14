'use client';

import { UserCircle } from 'lucide-react';

interface AnimatedAvatarProps {
  src: string | null;
  alt: string;
  size?: 'small' | 'medium' | 'large';
  isOnline?: boolean;
  className?: string;
}

export function AnimatedAvatar({
  src,
  alt,
  size = 'large',
  isOnline = false,
  className = '',
}: AnimatedAvatarProps) {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36',
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink animate-spin-slow" />
      <div className="absolute inset-[3px] rounded-full bg-white" />

      {/* Avatar */}
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden`}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center">
            <UserCircle className="w-full h-full p-4 text-white" />
          </div>
        )}
      </div>

      {/* Online indicator */}
      {isOnline && (
        <div className="absolute bottom-2 right-2 z-10">
          <div className="relative w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
