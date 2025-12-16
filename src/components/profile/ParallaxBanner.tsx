'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ParallaxBannerProps {
  imageUrl: string | null;
  height?: string;
  username?: string;
}

export function ParallaxBanner({ imageUrl, height = 'h-48 sm:h-56 md:h-72 lg:h-80', username }: ParallaxBannerProps) {
  const [scrollY, setScrollY] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Disable parallax on mobile and for reduced motion
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isMobile || prefersReducedMotion) {
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showImage = imageUrl && !imageError;

  return (
    <div className={`relative ${height} overflow-hidden bg-gradient-to-br from-digis-cyan/30 to-digis-pink/30`}>
      {/* Loading skeleton */}
      {imageUrl && !imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 via-digis-purple/20 to-digis-pink/20 animate-pulse" />
      )}

      {showImage ? (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <Image
            src={imageUrl}
            alt={username ? `${username}'s profile banner` : 'Profile banner'}
            fill
            sizes="100vw"
            priority
            className={`object-cover object-center transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 via-digis-purple/20 to-digis-pink/20" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  );
}
