'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Coins, TrendingUp, ArrowUpRight, DollarSign } from 'lucide-react';

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

export default function CreatorEarningsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchAnalytics();
  }, []);

  const checkAuth = async () => {
    // Auth check would go here
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/creator/analytics');
      const result = await response.json();
      if (response.ok && result.data) {
        setAnalytics(result.data);
      } else if (result.degraded) {
        console.warn('Analytics data degraded:', result.error);
        setAnalytics(result.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Earnings Breakdown */}
        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-500/50 p-6 shadow-fun">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 font-semibold">Stream Earnings</span>
                  <span className="text-2xl">🎥</span>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {analytics.overview.totalGiftCoins.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">
                  from {analytics.gifts.totalGifts} gifts
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-xl border border-blue-500/50 p-6 shadow-fun">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 font-semibold">Call Earnings</span>
                  <span className="text-2xl">📞</span>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {analytics.overview.totalCallEarnings.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">
                  from {analytics.calls.totalMinutes} minutes
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-500/50 p-6 shadow-fun">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 font-semibold">Total Earnings</span>
                  <span className="text-2xl">💰</span>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {analytics.overview.totalEarnings.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">
                  lifetime coins earned
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => router.push('/wallet')}
                className="glass rounded-xl border border-purple-200 p-6 hover:border-digis-cyan hover:bg-white/80 transition-all text-left shadow-fun group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-digis-cyan/20 to-blue-500/20 rounded-xl">
                    <Coins className="w-8 h-8 text-digis-cyan" />
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-gray-400 group-hover:text-digis-cyan group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Manage Wallet</h3>
                <p className="text-sm text-gray-600">
                  View balance, transactions, and request payouts
                </p>
              </button>

              <button
                onClick={() => router.push('/creator/analytics')}
                className="glass rounded-xl border border-purple-200 p-6 hover:border-digis-pink hover:bg-white/80 transition-all text-left shadow-fun group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-digis-pink" />
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-gray-400 group-hover:text-digis-pink group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">View Analytics</h3>
                <p className="text-sm text-gray-600">
                  Track followers, streams, and performance metrics
                </p>
              </button>
            </div>

            {/* Top Supporters */}
            {analytics.topGifters.length > 0 && (
              <div className="mb-8 glass rounded-2xl border border-yellow-200 p-6 shadow-fun">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    ⭐ Top Supporters
                  </h3>
                  <span className="text-sm text-gray-600">Your biggest fans</span>
                </div>
                <div className="space-y-3">
                  {analytics.topGifters.map((gifter, index) => (
                    <div
                      key={gifter.userId}
                      className="flex items-center gap-4 bg-white/60 rounded-lg p-4 border border-yellow-100 hover:bg-white/80 transition-colors"
                    >
                      <div className="text-2xl font-bold text-gray-600 w-8">
                        #{index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold flex-shrink-0">
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
                        <div className="font-semibold text-gray-800">
                          {gifter.displayName || gifter.username}
                        </div>
                        <div className="text-xs text-gray-600">
                          {gifter.giftCount} gifts sent
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-yellow-500">
                          {gifter.totalCoins.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">coins</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earnings Insights */}
            <div className="glass rounded-2xl border border-purple-200 p-6 shadow-fun">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-digis-cyan" />
                Earnings Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Average Gift Value</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {analytics.gifts.averageGiftValue.toFixed(1)} coins
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Average Call Earnings</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {analytics.calls.totalCalls > 0
                      ? (analytics.calls.totalEarnings / analytics.calls.totalCalls).toFixed(0)
                      : 0} coins
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Total Streams</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {analytics.streams.totalStreams}
                  </div>
                </div>
                <div className="bg-white/60 rounded-lg p-4 border border-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Total Calls</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {analytics.calls.totalCalls}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!analytics && (
          <div className="glass rounded-2xl border border-purple-200 p-12 text-center shadow-fun">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Earnings Yet</h3>
            <p className="text-gray-600 mb-6">
              Start streaming and accepting calls to earn coins!
            </p>
            <button
              onClick={() => router.push('/creator/go-live')}
              className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Go Live Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
