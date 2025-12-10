'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Video, FileText, ChevronDown, Ticket } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function MobileWalletWidget() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [userRole, setUserRole] = useState<string>('fan');
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile for username and role
        const profileResponse = await fetch('/api/user/profile');
        const profileData = await profileResponse.json();

        if (profileData.user) {
          setUsername(profileData.user.username || profileData.user.email?.split('@')[0] || 'User');
          setUserRole(profileData.user.role || 'fan');
        }

        // Fetch balance
        const balanceResponse = await fetch('/api/wallet/balance');
        const balanceData = await balanceResponse.json();

        if (balanceResponse.ok) {
          setBalance(balanceData.balance || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="md:hidden mb-2 px-4 pt-1">
        <div className="rounded-2xl bg-black/40 border border-cyan-500/20 p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-cyan-500/20 rounded"></div>
            <div className="h-5 w-16 bg-cyan-500/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden mb-2 px-4 pt-1 relative">
      {/* Main Widget Button - Tron Theme */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full backdrop-blur-xl bg-black/60 rounded-2xl border border-cyan-500/30 p-4 hover:border-cyan-500/50 transition-all active:scale-98 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-sm">
              {username[0]?.toUpperCase() || 'U'}
            </div>
            <span className="font-bold text-white text-lg drop-shadow-lg">
              {username}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-3 py-2 rounded-xl border border-green-500/30">
              <Coins className="w-5 h-5 text-green-600" />
              <span className="font-black text-white text-lg drop-shadow-lg">
                {balance}
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-white/70 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Content - Tron Theme */}
          <div className="absolute top-full left-4 right-4 mt-2 z-50 backdrop-blur-xl bg-black/80 rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.15)] overflow-hidden">
            {/* Buy Coins */}
            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/wallet');
              }}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors border-b border-cyan-500/20"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-white drop-shadow">Buy Coins</div>
                <div className="text-xs text-white/70">Add coins to your wallet</div>
              </div>
            </button>

            {/* Creator Actions */}
            {userRole === 'creator' && (
              <>
                {/* Go Live */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/creator/go-live');
                  }}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors border-b border-cyan-500/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white drop-shadow">Go Live</div>
                    <div className="text-xs text-white/70">Start streaming now</div>
                  </div>
                </button>

                {/* Upload */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/creator/content/new');
                  }}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors border-b border-cyan-500/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white drop-shadow">Upload</div>
                    <div className="text-xs text-white/70">Share PPV content</div>
                  </div>
                </button>

                {/* My Streams */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/creator/streams');
                  }}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white drop-shadow">My Streams</div>
                    <div className="text-xs text-white/70">Create free or paid streams</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
