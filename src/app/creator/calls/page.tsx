'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CallRequestQueue } from '@/components/calls/CallRequestQueue';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Phone, Clock, Coins, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

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
  const [authChecking, setAuthChecking] = useState(true);

  // Auth check - verify user is a creator
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Check role from JWT metadata
      const role = (user.app_metadata as any)?.role || (user.user_metadata as any)?.role;
      if (role !== 'creator') {
        router.push('/dashboard');
        return;
      }

      setAuthChecking(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authChecking) {
      fetchCallStats();
    }
  }, [authChecking]);

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

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Tron-style animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container max-w-7xl mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/creator/dashboard')}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Pending Requests - Top of page */}
        <div className="mb-8">
          <CallRequestQueue autoRefresh refreshInterval={5000} />
        </div>

        {/* Stats Overview */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-yellow-400/10 backdrop-blur-xl border border-yellow-400/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Calls */}
            <div className="backdrop-blur-xl bg-black/40 border-2 border-yellow-400/50 rounded-xl p-6 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-gray-300 text-sm font-medium">Total Calls</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{stats.totalCalls}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.callsToday} today</p>
            </div>

            {/* Total Minutes */}
            <div className="backdrop-blur-xl bg-black/40 border-2 border-cyan-400/50 rounded-xl p-6 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-cyan-400/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-gray-300 text-sm font-medium">Total Minutes</span>
              </div>
              <p className="text-3xl font-bold text-cyan-400">
                {stats.totalMinutes.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
              </p>
            </div>

            {/* Total Earnings in Digis Coins */}
            <div className="backdrop-blur-xl bg-black/40 border-2 border-green-400/50 rounded-xl p-6 hover:border-green-400 hover:shadow-[0_0_30px_rgba(74,222,128,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5 text-gray-900" />
                </div>
                <span className="text-gray-300 text-sm font-medium">Total Earnings</span>
              </div>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                {stats.totalEarnings.toLocaleString()} Coins
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
