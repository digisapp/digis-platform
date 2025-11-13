'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  Coins,
  Clock,
  Calendar,
  DollarSign,
  Gift,
  MessageCircle,
  Target,
} from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  totalViewers: number;
  averageViewDuration: number;
  totalEarnings: number;
  totalTips: number;
  totalMessages: number;
  peakConcurrentViewers: number;
  engagementRate: number;
  revenueGrowth: number;
  viewerGrowth: number;
  topStreams: Array<{
    id: string;
    title: string;
    views: number;
    earnings: number;
    date: string;
  }>;
  earningsBreakdown: {
    tips: number;
    gifts: number;
    subscriptions: number;
    ppv: number;
  };
  viewersByHour: Array<{
    hour: number;
    viewers: number;
  }>;
}

interface StreamAnalyticsDashboardProps {
  timeRange?: '7d' | '30d' | '90d' | 'all';
}

export function StreamAnalyticsDashboard({ timeRange = '30d' }: StreamAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/streams?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('[StreamAnalyticsDashboard] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount / 100); // Assuming coins are in cents
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-white/50 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Views */}
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 hover:border-digis-cyan transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-500" />
            </div>
            {analytics.viewerGrowth !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                analytics.viewerGrowth > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analytics.viewerGrowth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(analytics.viewerGrowth)}%</span>
              </div>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Views</h3>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalViews)}</p>
        </div>

        {/* Unique Viewers */}
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 hover:border-digis-cyan transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-sm font-semibold text-gray-500">
              Peak: {analytics.peakConcurrentViewers}
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Unique Viewers</h3>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalViewers)}</p>
        </div>

        {/* Total Earnings */}
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 hover:border-digis-cyan transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            {analytics.revenueGrowth !== 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold ${
                analytics.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {analytics.revenueGrowth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(analytics.revenueGrowth)}%</span>
              </div>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Earnings</h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            {formatCurrency(analytics.totalEarnings)}
          </p>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 hover:border-digis-cyan transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-pink-500" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Engagement Rate</h3>
          <p className="text-3xl font-bold text-gray-900">{analytics.engagementRate.toFixed(1)}%</p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(analytics.engagementRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average View Duration */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">Avg Watch Time</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.averageViewDuration)}</p>
        </div>

        {/* Total Tips */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">Total Tips</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalTips)}</p>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-cyan-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">Chat Messages</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalMessages)}</p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 text-purple-500" />
          Revenue Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600 mb-1">Tips</p>
            <p className="text-2xl font-bold text-yellow-700">
              {formatCurrency(analytics.earningsBreakdown.tips)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {((analytics.earningsBreakdown.tips / analytics.totalEarnings) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <p className="text-sm text-gray-600 mb-1">Gifts</p>
            <p className="text-2xl font-bold text-pink-700">
              {formatCurrency(analytics.earningsBreakdown.gifts)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {((analytics.earningsBreakdown.gifts / analytics.totalEarnings) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Subscriptions</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(analytics.earningsBreakdown.subscriptions)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {((analytics.earningsBreakdown.subscriptions / analytics.totalEarnings) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">PPV</p>
            <p className="text-2xl font-bold text-purple-700">
              {formatCurrency(analytics.earningsBreakdown.ppv)}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {((analytics.earningsBreakdown.ppv / analytics.totalEarnings) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Streams */}
      <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          Top Performing Streams
        </h2>
        <div className="space-y-3">
          {analytics.topStreams.map((stream, index) => (
            <div
              key={stream.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{stream.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(stream.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Eye className="w-4 h-4" />
                    <span>{formatNumber(stream.views)}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <Coins className="w-4 h-4" />
                    <span>{formatCurrency(stream.earnings)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
