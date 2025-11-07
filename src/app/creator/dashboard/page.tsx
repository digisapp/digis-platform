'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { CallSettings } from '@/components/creator/CallSettings';
import { PendingCalls } from '@/components/calls/PendingCalls';

interface Analytics {
  overview: {
    totalEarnings: number;
    totalGiftCoins: number;
    totalCallEarnings: number;
    totalStreams: number;
    totalCalls: number;
    totalStreamViews: number;
    peakViewers: number;
  };
  streams: {
    totalStreams: number;
    totalViews: number;
    peakViewers: number;
    averageViewers: number;
  };
  calls: {
    totalCalls: number;
    totalMinutes: number;
    totalEarnings: number;
    averageCallLength: number;
  };
  gifts: {
    totalGifts: number;
    totalCoins: number;
    averageGiftValue: number;
  };
  topGifters: Array<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalCoins: number;
    giftCount: number;
  }>;
}

export default function CreatorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    checkAuth();
    fetchBalance();
    fetchAnalytics();
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/creator/analytics');
      const data = await response.json();
      if (response.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
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

        {/* Pending Calls */}
        <div className="mb-8">
          <PendingCalls />
        </div>

        {/* Call Settings */}
        <div className="mb-8">
          <CallSettings />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">👁️</div>
            <div className="text-2xl font-bold text-digis-cyan mb-1">
              {analytics?.streams.totalViews || 0}
            </div>
            <div className="text-xs text-gray-400">Total Stream Views</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {analytics?.streams.peakViewers || 0}
            </div>
            <div className="text-xs text-gray-400">Peak Viewers</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">🎁</div>
            <div className="text-2xl font-bold text-digis-pink mb-1">
              {analytics?.gifts.totalGifts || 0}
            </div>
            <div className="text-xs text-gray-400">Gifts Received</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-5 text-center">
            <div className="text-3xl mb-2">📱</div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {analytics?.calls.totalCalls || 0}
            </div>
            <div className="text-xs text-gray-400">Calls Completed</div>
          </div>
        </div>

        {/* Earnings Breakdown */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-500/30 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Stream Earnings</span>
                <span className="text-2xl">🎥</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {analytics.overview.totalGiftCoins}
              </div>
              <div className="text-xs text-gray-400">
                from {analytics.gifts.totalGifts} gifts
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-500/30 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Call Earnings</span>
                <span className="text-2xl">📞</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {analytics.overview.totalCallEarnings}
              </div>
              <div className="text-xs text-gray-400">
                from {analytics.calls.totalMinutes} minutes
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-500/30 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Total Earnings</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {analytics.overview.totalEarnings}
              </div>
              <div className="text-xs text-gray-400">
                lifetime coins earned
              </div>
            </div>
          </div>
        )}

        {/* Top Supporters */}
        {analytics && analytics.topGifters.length > 0 && (
          <div className="mb-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">⭐ Top Supporters</h3>
            <div className="space-y-3">
              {analytics.topGifters.map((gifter, index) => (
                <div
                  key={gifter.userId}
                  className="flex items-center gap-4 bg-white/5 rounded-lg p-3"
                >
                  <div className="text-2xl font-bold text-gray-500">
                    #{index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold">
                    {gifter.avatarUrl ? (
                      <img
                        src={gifter.avatarUrl}
                        alt={gifter.displayName || gifter.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>
                        {(gifter.displayName || gifter.username)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {gifter.displayName || gifter.username}
                    </div>
                    <div className="text-xs text-gray-400">
                      {gifter.giftCount} gifts sent
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">
                      {gifter.totalCoins}
                    </div>
                    <div className="text-xs text-gray-400">coins</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
