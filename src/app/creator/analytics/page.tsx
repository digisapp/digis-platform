'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, Video, TrendingUp, Eye, Clock, Coins, ArrowRight } from 'lucide-react';

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Analytics & Insights 📊</h1>
          <p className="text-gray-600">Track your growth, performance, and audience</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-digis-cyan" />
              <span className="text-gray-600 text-sm font-medium">Total Followers</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{stats?.followers.total || 0}</p>
            <p className="text-sm text-gray-600 mt-1">
              +{stats?.followers.thisWeek || 0} this week
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-purple-500" />
              <span className="text-gray-600 text-sm font-medium">Total Streams</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{stats?.streams.total || 0}</p>
            <p className="text-sm text-gray-600 mt-1">
              {stats?.streams.totalViews || 0} total views
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-gray-600 text-sm font-medium">Total Earnings</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{stats?.earnings.total || 0}</p>
            <p className="text-sm text-gray-600 mt-1">coins earned all-time</p>
          </GlassCard>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Followers */}
          <GlassCard className="p-8 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => router.push('/creator/analytics/followers')}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-digis-cyan/20 to-blue-500/20 rounded-xl">
                <Users className="w-8 h-8 text-digis-cyan" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-digis-cyan group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Followers</h3>
            <p className="text-gray-600 mb-4">
              View your complete follower list, growth trends, and engagement metrics
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Growth tracking</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Eye className="w-4 h-4" />
                <span>Engagement stats</span>
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

        {/* Coming Soon */}
        <div className="mt-8">
          <GlassCard className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400/30">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🚀</div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">More Analytics Coming Soon</h3>
                <p className="text-gray-600 text-sm">
                  We're building advanced analytics including revenue forecasts, audience demographics,
                  peak streaming times, content performance comparisons, and more!
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
