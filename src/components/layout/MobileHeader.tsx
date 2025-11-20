'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function MobileHeader() {
  const pathname = usePathname();

  // Determine if we're on a dark or light page
  const isDarkPage = pathname?.startsWith('/dashboard') ||
                     pathname?.startsWith('/wallet') ||
                     pathname?.startsWith('/live') ||
                     pathname?.startsWith('/stream') ||
                     pathname?.startsWith('/vod') ||
                     pathname === '/';

  const logoSrc = isDarkPage ? '/images/digis-logo-white.png' : '/images/digis-logo-black.png';

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-3xl bg-white/15 border-b border-white/20 shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-center h-14 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Image
          src={logoSrc}
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
