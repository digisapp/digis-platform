'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function MobileWalletWidget() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch user profile for username
        const profileResponse = await fetch('/api/user/profile');
        const profileData = await profileResponse.json();

        if (profileData.user) {
          setUsername(profileData.user.username || profileData.user.email?.split('@')[0] || 'User');
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
    <div className="md:hidden mb-4 px-4">
      <button
        onClick={() => router.push('/wallet')}
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
          <div className="flex items-center gap-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-3 py-2 rounded-xl border border-green-500/30">
            <Coins className="w-5 h-5 text-green-600" />
            <span className="font-black text-gray-900 text-lg">
              {balance}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
