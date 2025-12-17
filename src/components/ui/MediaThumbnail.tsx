'use client';

import { useState } from 'react';
import Image from 'next/image';

interface MediaThumbnailProps {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  width?: number;
  height?: number;
}

// Video file extensions that shouldn't go through next/image
const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.mkv', '.m4v', '.wmv', '.flv'];

function isVideoUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lowerUrl.includes(ext));
}

export function MediaThumbnail({ src, alt, fill, className, sizes, width, height }: MediaThumbnailProps) {
  const [error, setError] = useState(false);

  // If it's a video URL or we had an error, use regular img tag
  if (isVideoUrl(src) || error) {
    // For videos, show a video element with poster or first frame
    if (isVideoUrl(src)) {
      return (
        <div className={`relative ${fill ? 'absolute inset-0' : ''}`}>
          <video
            src={src}
            className={className}
            style={fill ? { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' } : { width, height }}
            muted
            playsInline
            preload="metadata"
          />
          {/* Play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl ml-1">▶</span>
            </div>
          </div>
        </div>
      );
    }

    // Fallback to regular img for errored images
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={fill ? { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' } : { width, height }}
      />
    );
  }

  // Use next/image for actual images
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 300}
      height={height || 300}
      sizes={sizes}
      className={className}
      onError={() => setError(true)}
    />
  );
}
