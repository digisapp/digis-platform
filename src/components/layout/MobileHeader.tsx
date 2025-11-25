'use client';

import Image from 'next/image';

export function MobileHeader() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40">
      {/* Tron-themed background */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

      {/* Animated gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(34,211,238,0.4)]" />

      {/* Content */}
      <div className="relative flex items-center justify-center h-14 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="relative">
          {/* Logo glow effect */}
          <div className="absolute inset-0 blur-lg bg-cyan-400/30 scale-150" />
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={80}
            height={28}
            className="relative h-7 w-auto drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]"
            priority
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
