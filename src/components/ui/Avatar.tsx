'use client';

import Image from 'next/image';
import { useState } from 'react';

interface AvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  ring?: boolean;
  ringColor?: string;
}

const sizeMap = {
  xs: { width: 20, height: 20, className: 'w-5 h-5' },
  sm: { width: 32, height: 32, className: 'w-8 h-8' },
  md: { width: 40, height: 40, className: 'w-10 h-10' },
  lg: { width: 48, height: 48, className: 'w-12 h-12' },
  xl: { width: 80, height: 80, className: 'w-20 h-20' },
};

export function Avatar({
  src,
  alt,
  size = 'md',
  className = '',
  ring = false,
  ringColor = 'ring-white',
}: AvatarProps) {
  const [error, setError] = useState(false);
  const { width, height, className: sizeClass } = sizeMap[size];

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'U')}&background=6366f1&color=fff&size=${width * 2}`;
  const imageUrl = error || !src ? fallbackUrl : src;

  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <Image
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        className={`rounded-full object-cover ${sizeClass} ${ring ? `ring-2 ${ringColor}` : ''}`}
        onError={() => setError(true)}
        unoptimized={imageUrl.includes('ui-avatars.com')}
      />
    </div>
  );
}
