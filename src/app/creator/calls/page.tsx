'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CallRequestQueue } from '@/components/calls/CallRequestQueue';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Phone, Video, Clock, TrendingUp, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CallStats {
  totalCalls: number;
  totalMinutes: number;
  totalEarnings: number;
  averageRating: number;
  callsToday: number;
  pendingRequests: number;
}

export default function CreatorCallsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCallStats();
  }, []);

  const fetchCallStats = async () => {
    try {
      const response = await fetch('/api/calls/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('[CreatorCallsPage] Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-pastel-gradient">
      {/* Mobile Header with Logo */}
      <MobileHeader />
      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/creator/dashboard')}
            className="text-gray-600 hover:text-gray-800 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Call Management 📞
          </h1>
          <p className="text-gray-600">
            Accept calls from fans and earn per minute
          </p>
        </div>

        {/* Stats Overview */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Calls */}
            <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-gray-600 text-sm font-medium">Total Calls</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
              <p className="text-xs text-gray-600 mt-1">{stats.callsToday} today</p>
            </div>

            {/* Total Minutes */}
            <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-gray-600 text-sm font-medium">Total Minutes</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.totalMinutes.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
              </p>
            </div>

            {/* Total Earnings */}
            <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-green-400 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-gray-600 text-sm font-medium">Total Earnings</span>
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-green-600 bg-clip-text text-transparent">
                {formatCurrency(stats.totalEarnings)}
              </p>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-xl p-6 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-gray-600 text-sm font-medium">Pending</span>
              </div>
              <p className="text-3xl font-bold text-red-600">{stats.pendingRequests}</p>
              {stats.pendingRequests > 0 && (
                <p className="text-xs text-red-600 mt-1 animate-pulse font-semibold">
                  Waiting for response
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Call Request Queue */}
        <CallRequestQueue autoRefresh refreshInterval={5000} />

        {/* Info Card */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                How Call Earnings Work
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    You earn your per-minute rate for every minute you're on the call
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    Timer starts when you accept and stops when either party ends the call
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    Earnings are automatically credited to your wallet after each call
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>
                    You can set your rates in Settings → Call Pricing
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call History Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/calls')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-purple-200 text-gray-900 rounded-xl font-semibold hover:border-digis-cyan hover:scale-105 transition-all"
          >
            <Calendar className="w-5 h-5" />
            View Calls
          </button>
        </div>
      </div>
    </div>
  );
}
