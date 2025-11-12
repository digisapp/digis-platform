'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Video, FileText, ShoppingCart, ChevronDown, Ticket } from 'lucide-react';
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
      <div className="md:hidden mb-4 px-4">
        <div className="glass rounded-2xl border-2 border-purple-200 p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-gray-300 rounded"></div>
            <div className="h-5 w-16 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden mb-4 px-4 relative">
      {/* Main Widget Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full glass rounded-2xl border-2 border-purple-200 p-4 hover:border-digis-cyan transition-all active:scale-98 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold text-sm">
              {username[0]?.toUpperCase() || 'U'}
            </div>
            <span className="font-bold text-gray-900 text-lg">
              {username}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-3 py-2 rounded-xl border border-green-500/30">
              <Coins className="w-5 h-5 text-green-600" />
              <span className="font-black text-gray-900 text-lg">
                {balance}
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
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

          {/* Dropdown Content */}
          <div className="absolute top-full left-4 right-4 mt-2 z-50 glass rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden">
            {/* Buy Tokens */}
            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/wallet');
              }}
              className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/60 transition-colors border-b border-purple-100"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-gray-900">Buy Tokens</div>
                <div className="text-xs text-gray-600">Add coins to your wallet</div>
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
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/60 transition-colors border-b border-purple-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-gray-900">Go Live</div>
                    <div className="text-xs text-gray-600">Start streaming now</div>
                  </div>
                </button>

                {/* Create Post */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/creator/content/new');
                  }}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/60 transition-colors border-b border-purple-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-gray-900">Create Post</div>
                    <div className="text-xs text-gray-600">Share PPV content</div>
                  </div>
                </button>

                {/* Ticketed Shows */}
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    router.push('/creator/shows');
                  }}
                  className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-gray-900">Ticketed Shows</div>
                    <div className="text-xs text-gray-600">Create exclusive events</div>
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
