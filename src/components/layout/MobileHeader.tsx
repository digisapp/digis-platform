'use client';

import Image from 'next/image';

export function MobileHeader() {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-3xl bg-black/40 border-b-2 border-cyan-500/30 shadow-[0_2px_30px_rgba(34,211,238,0.2)]">
      <div className="flex items-center justify-center h-14 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Image
          src="/images/digis-logo-white.png"
          alt="Digis"
          width={80}
          height={28}
          className="h-7 w-auto"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}
