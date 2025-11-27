'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Coins, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function MobileHeader() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch balance when user is authenticated
  useEffect(() => {
    if (!authUser) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
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
    };

    fetchBalance();
  }, [authUser?.id]);

  const isLoggedIn = !!authUser;

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Tron-themed background - extends behind safe area */}
      <div className="absolute inset-0 -top-[env(safe-area-inset-top)] bg-black/95 backdrop-blur-xl" style={{ top: 'calc(-1 * env(safe-area-inset-top, 0px))' }} />

      {/* Animated gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(34,211,238,0.4)]" />

      {/* Content */}
      <div className="relative flex items-center justify-between h-14 px-4 py-2">
        {/* Left spacer for balance */}
        <div className="w-28" />

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

        {/* Right - Wallet Button (logged in) or Sign In Button (logged out) */}
        {isLoggedIn && balance !== null ? (
          <button
            onClick={() => router.push('/wallet')}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/60 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)] touch-manipulation active:scale-95 transition-transform"
          >
            <Coins className="w-6 h-6 text-green-400" />
            <span className="text-lg font-bold text-green-400">{balance}</span>
          </button>
        ) : !isLoggedIn && !authLoading ? (
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(34,211,238,0.4)] touch-manipulation active:scale-95 transition-transform"
          >
            <LogIn className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white">Sign In</span>
          </button>
        ) : (
          <div className="w-28" />
        )}
      </div>
    </div>
  );
}

// Height constant for consistent spacing across app
// Use: pt-[calc(56px+env(safe-area-inset-top))] or this value
export const MOBILE_HEADER_HEIGHT = 56; // h-14 = 56px
