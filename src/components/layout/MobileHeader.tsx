'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function MobileHeader() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setIsLoggedIn(true);
        try {
          const response = await fetch('/api/wallet/balance');
          const data = await response.json();
          if (response.ok) {
            setBalance(data.balance || 0);
          }
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(0); // Show 0 on error instead of hiding
        }
      }
    };

    fetchBalance();
  }, []);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Tron-themed background - extends behind safe area */}
      <div className="absolute inset-0 -top-[env(safe-area-inset-top)] bg-black/95 backdrop-blur-xl" style={{ top: 'calc(-1 * env(safe-area-inset-top, 0px))' }} />

      {/* Animated gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(34,211,238,0.4)]" />

      {/* Content */}
      <div className="relative flex items-center justify-between h-12 px-4">
        {/* Left spacer for balance */}
        <div className="w-20" />

        {/* Center Logo */}
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

        {/* Right - Floating Wallet Button */}
        {isLoggedIn && balance !== null ? (
          <button
            onClick={() => router.push('/wallet')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)] touch-manipulation active:scale-95 transition-transform"
          >
            <Coins className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400">{balance}</span>
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </div>
  );
}

// Height constant for consistent spacing across app
// Use: pt-[calc(48px+env(safe-area-inset-top))] or this value
export const MOBILE_HEADER_HEIGHT = 48; // h-12 = 48px
