'use client';

import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Eye, Users, UserPlus, TrendingUp, TrendingDown, Smartphone, Monitor, Tablet } from 'lucide-react';
import type { TrafficData, TrafficRange } from './types';

interface AdminTrafficTabProps {
  loading: boolean;
  traffic: TrafficData | null;
  trafficRange: TrafficRange;
  setTrafficRange: (range: TrafficRange) => void;
  onRetry: () => void;
}

export function AdminTrafficTab({ loading, traffic, trafficRange, setTrafficRange, onRetry }: AdminTrafficTabProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!traffic) {
    return (
      <GlassCard className="p-12 text-center">
        <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No traffic data available</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex gap-2">
        {(['24h', '7d', '30d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTrafficRange(range)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              trafficRange === range
                ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Page Views</p>
              <p className="text-2xl font-bold">{traffic.summary.totalViews.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Eye className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            {traffic.summary.viewsGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={traffic.summary.viewsGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
              {traffic.summary.viewsGrowth >= 0 ? '+' : ''}{traffic.summary.viewsGrowth}%
            </span>
            <span className="text-gray-500">vs previous period</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Unique Visitors</p>
              <p className="text-2xl font-bold">{traffic.summary.uniqueVisitors.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            {traffic.summary.visitorsGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={traffic.summary.visitorsGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
              {traffic.summary.visitorsGrowth >= 0 ? '+' : ''}{traffic.summary.visitorsGrowth}%
            </span>
            <span className="text-gray-500">vs previous period</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">New Signups (7d)</p>
              <p className="text-2xl font-bold">{traffic.summary.lastWeekSignups}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            {traffic.summary.signupsGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={traffic.summary.signupsGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
              {traffic.summary.signupsGrowth >= 0 ? '+' : ''}{traffic.summary.signupsGrowth}%
            </span>
            <span className="text-gray-500">vs last week</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Top Device</p>
              <p className="text-2xl font-bold capitalize">
                {traffic.viewsByDevice[0]?.device || 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              {traffic.viewsByDevice[0]?.device === 'mobile' ? (
                <Smartphone className="w-6 h-6 text-blue-400" />
              ) : traffic.viewsByDevice[0]?.device === 'tablet' ? (
                <Tablet className="w-6 h-6 text-blue-400" />
              ) : (
                <Monitor className="w-6 h-6 text-blue-400" />
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {traffic.viewsByDevice[0]?.views.toLocaleString() || 0} views
          </p>
        </GlassCard>
      </div>

      {/* Views by Page Type & Device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Views by Page Type</h3>
          <div className="space-y-3">
            {traffic.viewsByPageType.map((item, i) => {
              const maxViews = traffic.viewsByPageType[0]?.views || 1;
              const percentage = (item.views / maxViews) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{item.pageType}</span>
                    <span className="text-gray-400">{item.views.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-digis-cyan to-digis-pink rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Views by Device</h3>
          <div className="space-y-3">
            {traffic.viewsByDevice.map((item, i) => {
              const maxViews = traffic.viewsByDevice[0]?.views || 1;
              const percentage = (item.views / maxViews) * 100;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize flex items-center gap-2">
                      {item.device === 'mobile' ? (
                        <Smartphone className="w-4 h-4" />
                      ) : item.device === 'tablet' ? (
                        <Tablet className="w-4 h-4" />
                      ) : (
                        <Monitor className="w-4 h-4" />
                      )}
                      {item.device}
                    </span>
                    <span className="text-gray-400">{item.views.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Top Pages and Creator Profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Pages</h3>
          <div className="space-y-2">
            {traffic.topPages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No page views yet</p>
            ) : (
              traffic.topPages.map((page, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
                    <span className="font-mono text-sm truncate max-w-[200px]">{page.path}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{page.views.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Creator Profiles</h3>
          <div className="space-y-2">
            {traffic.topCreatorProfiles.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No profile views yet</p>
            ) : (
              traffic.topCreatorProfiles.map((creator, i) => (
                <a
                  key={i}
                  href={`/${creator.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
                    <span className="font-medium text-digis-cyan hover:underline">@{creator.username}</span>
                  </div>
                  <span className="text-gray-400 text-sm">{creator.views.toLocaleString()} views</span>
                </a>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Combined Timeline */}
      {traffic.combinedTimeline && traffic.combinedTimeline.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Activity Over Time</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-digis-cyan to-digis-pink" />
                <span className="text-gray-400">Page Views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-400">Signups</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end gap-1">
            {traffic.combinedTimeline.map((day, i) => {
              const maxViews = Math.max(...traffic.combinedTimeline.map(d => d.views));
              const maxSignups = Math.max(...traffic.combinedTimeline.map(d => d.signups));
              const viewsHeight = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
              const signupsHeight = maxSignups > 0 ? (day.signups / maxSignups) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex items-end gap-0.5 h-[200px]">
                    <div
                      className="flex-1 bg-gradient-to-t from-digis-cyan to-digis-pink rounded-t transition-all group-hover:opacity-80"
                      style={{ height: `${Math.max(viewsHeight, 2)}%` }}
                    />
                    <div
                      className="flex-1 bg-green-500 rounded-t transition-all group-hover:opacity-80"
                      style={{ height: `${Math.max(signupsHeight, day.signups > 0 ? 10 : 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 rotate-45 origin-left whitespace-nowrap">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <p className="text-white font-medium">{new Date(day.date).toLocaleDateString()}</p>
                    <p className="text-cyan-400">{day.views.toLocaleString()} views</p>
                    <p className="text-green-400">{day.signups} signups</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
