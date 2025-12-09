'use client';

import { useEffect, useState } from 'react';

interface ParallaxBannerProps {
  imageUrl: string | null;
  height?: string;
}

export function ParallaxBanner({ imageUrl, height = 'h-48 sm:h-56 md:h-72 lg:h-80' }: ParallaxBannerProps) {
  const [scrollY, setScrollY] = useState(0);

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

  return (
    <div className={`relative ${height} overflow-hidden bg-gradient-to-br from-digis-cyan/30 to-digis-pink/30`}>
      {imageUrl ? (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <img
            src={imageUrl}
            alt="Profile banner"
            className="w-full h-full object-cover object-center"
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
