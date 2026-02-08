'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Users, CheckCircle, Clock, XCircle, Star } from 'lucide-react';
import type { CreatorActivityData, ActivityFilter } from './types';

interface AdminActivityTabProps {
  loading: boolean;
  creatorActivity: CreatorActivityData | null;
  activityFilter: ActivityFilter;
  setActivityFilter: (filter: ActivityFilter) => void;
  onRetry: () => void;
}

const FILTER_LABELS: Record<ActivityFilter, string> = {
  all: 'All Creators',
  active_today: 'Active Today',
  active_week: 'Active This Week',
  active_month: 'Active This Month',
  inactive: 'Inactive (30+ days)',
};

export function AdminActivityTab({ loading, creatorActivity, activityFilter, setActivityFilter, onRetry }: AdminActivityTabProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!creatorActivity) {
    return (
      <GlassCard className="p-12 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No activity data available</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  const filteredCreators = creatorActivity.creators.filter(
    c => activityFilter === 'all' || c.activityStatus === activityFilter
  );

  return (
    <div className="space-y-6">
      {/* Activity Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Creators</p>
              <p className="text-xl font-bold">{creatorActivity.summary.totalCreators}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActivityFilter('active_today')}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Active Today</p>
              <p className="text-xl font-bold text-green-400">{creatorActivity.summary.activeToday}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActivityFilter('active_week')}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 rounded-lg"><Clock className="w-5 h-5 text-cyan-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Active This Week</p>
              <p className="text-xl font-bold text-cyan-400">{creatorActivity.summary.activeThisWeek}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActivityFilter('active_month')}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-lg"><Clock className="w-5 h-5 text-purple-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Active This Month</p>
              <p className="text-xl font-bold text-purple-400">{creatorActivity.summary.activeThisMonth}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActivityFilter('inactive')}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-lg"><XCircle className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Inactive</p>
              <p className="text-xl font-bold text-red-400">{creatorActivity.summary.inactive}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as ActivityFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setActivityFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activityFilter === filter
                ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {/* Creator List */}
      <GlassCard className="p-4 md:p-6">
        <h3 className="text-lg font-bold text-white mb-4">Creator Activity</h3>
        <div className="space-y-3">
          {filteredCreators.map((creator) => (
            <div
              key={creator.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer gap-3 md:gap-4"
              onClick={() => router.push(`/${creator.username}`)}
            >
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-base md:text-lg font-bold shrink-0">
                  {creator.avatarUrl ? (
                    <Image src={creator.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
                  ) : (
                    creator.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm md:text-base truncate">{creator.displayName || creator.username}</p>
                    {creator.isCreatorVerified && <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 shrink-0" />}
                    <span className={`px-2 py-0.5 text-[10px] md:text-xs rounded-full shrink-0 ${
                      creator.activityStatus === 'active_today' ? 'bg-green-500/20 text-green-400' :
                      creator.activityStatus === 'active_week' ? 'bg-cyan-500/20 text-cyan-400' :
                      creator.activityStatus === 'active_month' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {creator.activityStatus === 'active_today' ? 'Today' :
                       creator.activityStatus === 'active_week' ? 'Week' :
                       creator.activityStatus === 'active_month' ? 'Month' :
                       'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400">@{creator.username}</p>
                </div>
              </div>
              <div className="text-left md:text-right pl-13 md:pl-0">
                <p className="text-xs md:text-sm text-gray-300">
                  {creator.lastSeenAt
                    ? `${creator.daysSinceLastSeen === 0 ? 'Today' :
                        creator.daysSinceLastSeen === 1 ? 'Yesterday' :
                        `${creator.daysSinceLastSeen}d ago`}`
                    : 'Never'}
                </p>
                <p className="text-[10px] md:text-xs text-gray-500">{creator.followerCount.toLocaleString()} followers</p>
              </div>
            </div>
          ))}
          {filteredCreators.length === 0 && (
            <p className="text-gray-400 text-center py-8">No creators match this filter</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
