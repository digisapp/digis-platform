'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { CallSettings } from '@/components/creator/CallSettings';

export default function CreatorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [isCreator, setIsCreator] = useState(false);

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

    // Check if user is creator
    const response = await fetch('/api/user/profile');
    const data = await response.json();

    if (data.user?.role !== 'creator') {
      router.push('/dashboard');
      return;
    }

    setIsCreator(true);
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
          <h1 className="text-4xl font-bold text-white mb-2">Creator Dashboard 🎨</h1>
          <p className="text-gray-400">Manage your content, streams, and earnings</p>
        </div>

        {/* Balance Card */}
        <div className="mb-8 bg-gradient-to-r from-yellow-500/20 to-green-500/20 backdrop-blur-md rounded-2xl border-2 border-yellow-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Your Earnings</div>
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
              Withdraw
            </GlassButton>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/creator/go-live')}
            className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl border-2 border-red-500 p-6 hover:scale-105 transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-bold">GO LIVE</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Start Streaming</h3>
            <p className="text-sm text-gray-400">Go live and connect with your fans</p>
          </button>

          <button
            onClick={() => router.push('/live')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-cyan hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="text-lg font-bold text-white mb-2">My Streams</h3>
            <p className="text-sm text-gray-400">View your streaming history</p>
          </button>

          <button
            onClick={() => router.push('/calls/history')}
            className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-6 hover:border-digis-pink hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">📞</div>
            <h3 className="text-lg font-bold text-white mb-2">Call Requests</h3>
            <p className="text-sm text-gray-400">Manage 1-on-1 call requests</p>
          </button>
        </div>

        {/* Call Settings */}
        <div className="mb-8">
          <CallSettings />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">👁️</div>
            <div className="text-2xl font-bold text-digis-cyan mb-1">0</div>
            <div className="text-xs text-gray-400">Total Views</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">0</div>
            <div className="text-xs text-gray-400">Followers</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">🎁</div>
            <div className="text-2xl font-bold text-digis-pink mb-1">0</div>
            <div className="text-xs text-gray-400">Gifts Received</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">📱</div>
            <div className="text-2xl font-bold text-green-400 mb-1">0</div>
            <div className="text-xs text-gray-400">Calls Completed</div>
          </div>
        </div>

        {/* Creator Tips */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">💡 Creator Tips</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="text-xl">🎥</div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Stream Regularly</h4>
                <p className="text-xs text-gray-400">Consistent streaming builds a loyal audience</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">💬</div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Engage with Chat</h4>
                <p className="text-xs text-gray-400">Respond to messages to keep viewers engaged</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-xl">🎁</div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Thank Your Supporters</h4>
                <p className="text-xs text-gray-400">Acknowledge gifts and top supporters during streams</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
