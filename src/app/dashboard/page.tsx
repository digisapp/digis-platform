'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

export default function FanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchBalance();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    setLoading(false);
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      const data = await response.json();
      if (response.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome to Digis 👋</h1>
          <p className="text-gray-400">Explore live streams, connect with creators, and more</p>
        </div>

        {/* Balance Card */}
        <div className="mb-8 bg-gradient-to-r from-digis-cyan/20 to-digis-pink/20 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Your Balance</div>
              <div className="text-3xl font-bold text-white">{balance} coins</div>
            </div>
            <GlassButton
              variant="gradient"
              size="md"
              onClick={() => router.push('/wallet')}
              shimmer
              glow
            >
              <span className="text-xl mr-2">💰</span>
              Buy Coins
            </GlassButton>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => router.push('/live')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="text-lg font-bold text-white mb-2">Live Streams</h3>
            <p className="text-sm text-gray-400">Watch creators streaming now</p>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-pink hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">📞</div>
            <h3 className="text-lg font-bold text-white mb-2">Video Calls</h3>
            <p className="text-sm text-gray-400">Book 1-on-1 calls with creators</p>
          </button>

          <button
            onClick={() => router.push('/wallet')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-yellow-500 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">💳</div>
            <h3 className="text-lg font-bold text-white mb-2">Wallet</h3>
            <p className="text-sm text-gray-400">Manage your coins and transactions</p>
          </button>

          <button
            onClick={() => router.push('/creator/apply')}
            className="bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 backdrop-blur-md rounded-2xl border-2 border-digis-cyan p-6 hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">⭐</div>
            <h3 className="text-lg font-bold text-white mb-2">Become a Creator</h3>
            <p className="text-sm text-gray-400">Start earning on Digis</p>
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5">
            <div className="text-2xl mb-2">💬</div>
            <h4 className="text-sm font-semibold text-white mb-1">Real-Time Chat</h4>
            <p className="text-xs text-gray-400">Interact with creators during live streams</p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5">
            <div className="text-2xl mb-2">🎁</div>
            <h4 className="text-sm font-semibold text-white mb-1">Virtual Gifts</h4>
            <p className="text-xs text-gray-400">Send gifts and climb the leaderboard</p>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5">
            <div className="text-2xl mb-2">📱</div>
            <h4 className="text-sm font-semibold text-white mb-1">1-on-1 Calls</h4>
            <p className="text-xs text-gray-400">Book private video calls with your favorites</p>
          </div>
        </div>
      </div>
    </div>
  );
}
