'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, Video, TrendingUp, Eye, Clock, Coins, ArrowRight, ArrowUp, ArrowDown, Gift, MessageCircle } from 'lucide-react';

interface AnalyticsStats {
  followers: {
    total: number;
    thisWeek: number;
  };
  streams: {
    total: number;
    totalViews: number;
    totalMinutes: number;
    averageViewers: number;
  };
  earnings: {
    total: number;
    thisWeek: number;
  };
}

export default function CreatorAnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch analytics data from API
      const response = await fetch('/api/creator/analytics');
      if (response.ok) {
        const data = await response.json();
        setStats({
          followers: {
            total: 0, // Will be populated when we have the API
            thisWeek: 0,
          },
          streams: {
            total: data.streams?.totalStreams || 0,
            totalViews: data.streams?.totalViews || 0,
            totalMinutes: 0,
            averageViewers: data.streams?.averageViewers || 0,
          },
          earnings: {
            total: data.overview?.totalEarnings || 0,
            thisWeek: 0,
          },
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
      <div className="container mx-auto px-4 pt-4 pb-20 md:pb-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Followers Card */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/10 to-blue-500/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-digis-cyan to-blue-500 rounded-xl shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                {(stats?.followers?.thisWeek ?? 0) > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                    <ArrowUp className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-semibold text-green-600">
                      +{stats?.followers?.thisWeek}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Followers</p>
              <p className="text-4xl font-bold text-gray-800 mb-2">{stats?.followers.total.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-600">
                {(stats?.followers?.thisWeek ?? 0) > 0 ? `${stats?.followers?.thisWeek} new this week` : 'No new followers this week'}
              </p>
            </div>
          </GlassCard>

          {/* Streams Card */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full">
                  <Eye className="w-3 h-3 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600">
                    {stats?.streams.totalViews.toLocaleString() || 0}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Streams</p>
              <p className="text-4xl font-bold text-gray-800 mb-2">{stats?.streams.total.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-600">
                {(stats?.streams?.averageViewers ?? 0) > 0
                  ? `Avg ${Math.round(stats?.streams?.averageViewers ?? 0)} viewers per stream`
                  : 'Start streaming to see stats'}
              </p>
            </div>
          </GlassCard>

          {/* Earnings Card */}
          <GlassCard className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/5" />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                {(stats?.earnings?.thisWeek ?? 0) > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-semibold text-green-600">
                      +{stats?.earnings?.thisWeek}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Earnings</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold text-gray-800">{stats?.earnings.total.toLocaleString() || 0}</p>
                <span className="text-sm text-gray-600">coins</span>
              </div>
              <p className="text-xs text-gray-600">
                {(stats?.earnings?.thisWeek ?? 0) > 0 ? `${stats?.earnings?.thisWeek} earned this week` : 'All-time earnings'}
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Followers */}
          <GlassCard className="p-8 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => router.push('/creator/followers')}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-digis-cyan/20 to-blue-500/20 rounded-xl">
                <Users className="w-8 h-8 text-digis-cyan" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-digis-cyan group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Followers</h3>
            <p className="text-gray-600 mb-4">
              View and manage your followers and following lists
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span>Follower list</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Eye className="w-4 h-4" />
                <span>Following list</span>
              </div>
            </div>
          </GlassCard>

          {/* Stream History */}
          <GlassCard className="p-8 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => router.push('/creator/analytics/streams')}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl">
                <Video className="w-8 h-8 text-purple-500" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Stream History</h3>
            <p className="text-gray-600 mb-4">
              Review all your past streams with detailed performance analytics
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Duration & timing</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Eye className="w-4 h-4" />
                <span>Viewer analytics</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
