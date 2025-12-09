'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Coins, LogIn, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';

// Format large coin numbers (1000 -> 1k, 2500 -> 2.5k, 1000000 -> 1M)
const formatCoinBalance = (coins: number): string => {
  if (coins >= 1000000) {
    const millions = coins / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (coins >= 1000) {
    const thousands = coins / 1000;
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }
  return coins.toString();
};

export function MobileHeader() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);

  // Fetch balance and user role when user is authenticated
  useEffect(() => {
    if (!authUser) {
      setBalance(null);
      setUserRole(null);
      return;
    }

    const fetchUserData = async () => {
      try {
        // Fetch balance
        const balanceResponse = await fetch('/api/wallet/balance');
        const balanceData = await balanceResponse.json();
        if (balanceResponse.ok) {
          setBalance(balanceData.balance || 0);
        }

        // Fetch user role
        const profileResponse = await fetch('/api/user/profile');
        const profileData = await profileResponse.json();
        if (profileResponse.ok && profileData.user) {
          setUserRole(profileData.user.role || 'fan');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setBalance(0);
      }
    };

    fetchUserData();
  }, [authUser?.id]);

  const isLoggedIn = !!authUser;
  const isFan = userRole === 'fan';

  const handleWalletClick = () => {
    if (isFan) {
      setShowDropdown(!showDropdown);
    } else {
      // Creators go to full wallet page
      router.push('/wallet');
    }
  };

  const handleBuyCoins = () => {
    setShowDropdown(false);
    setShowBuyCoinsModal(true);
  };

  const refreshBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) {
        setBalance(data.balance || 0);
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Tron-themed background - extends behind safe area */}
      <div className="absolute inset-0 -top-[env(safe-area-inset-top)] bg-black/95 backdrop-blur-xl" style={{ top: 'calc(-1 * env(safe-area-inset-top, 0px))' }} />

      {/* Animated gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 shadow-[0_0_20px_rgba(34,211,238,0.8),0_0_40px_rgba(34,211,238,0.4)]" />

      {/* Content */}
      <div className="relative flex items-center justify-between h-16 px-4 pb-3 pt-1">
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
          <div className="relative">
            <button
              onClick={handleWalletClick}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/60 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)] touch-manipulation active:scale-95 transition-transform"
            >
              <Coins className="w-6 h-6 text-green-400" />
              <span className="text-lg font-bold text-green-400">{formatCoinBalance(balance)}</span>
            </button>

            {/* Fan Dropdown - Buy Coins */}
            {isFan && showDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />

                {/* Dropdown Content */}
                <div className="absolute top-full right-0 mt-2 z-50 backdrop-blur-xl bg-black/90 rounded-2xl border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden min-w-[160px]">
                  {/* Balance Header */}
                  <div className="px-4 py-3 border-b border-green-500/20">
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-400">
                        {balance.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Coins</div>
                    </div>
                  </div>

                  <button
                    onClick={handleBuyCoins}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-500/10 active:bg-green-500/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">Buy Coins</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : !isLoggedIn && !authLoading ? (
          <button
            onClick={() => router.push('/')}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-cyan-500/70 shadow-[0_0_20px_rgba(34,211,238,0.5),inset_0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.7),inset_0_0_25px_rgba(34,211,238,0.2)] touch-manipulation active:scale-95 transition-all duration-300"
          >
            <LogIn className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:to-blue-300">Sign In</span>
          </button>
        ) : (
          <div className="w-28" />
        )}
      </div>

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showBuyCoinsModal}
        onClose={() => setShowBuyCoinsModal(false)}
        onSuccess={refreshBalance}
      />
    </div>
  );
}

// Height constant for consistent spacing across app
// Use: pt-[calc(64px+env(safe-area-inset-top))] or this value
export const MOBILE_HEADER_HEIGHT = 64; // h-16 = 64px
