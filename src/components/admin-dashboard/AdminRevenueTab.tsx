'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Coins, DollarSign, TrendingUp, Users, Clock, CreditCard } from 'lucide-react';
import type { RevenueData } from './types';

interface AdminRevenueTabProps {
  loading: boolean;
  revenue: RevenueData | null;
  onRetry: () => void;
}

const RANK_COLORS = [
  'bg-yellow-500 text-black',
  'bg-gray-300 text-black',
  'bg-amber-600 text-white',
];

function RankBadge({ index }: { index: number }) {
  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
      RANK_COLORS[index] || 'bg-white/10 text-gray-400'
    }`}>
      {index + 1}
    </span>
  );
}

function CreatorAvatar({ avatarUrl, username, gradient = 'from-digis-cyan to-digis-pink' }: {
  avatarUrl: string | null;
  username: string;
  gradient?: string;
}) {
  return (
    <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold shrink-0`}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
      ) : (
        username?.[0]?.toUpperCase() || '?'
      )}
    </div>
  );
}

export function AdminRevenueTab({ loading, revenue, onRetry }: AdminRevenueTabProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!revenue) {
    return (
      <GlassCard className="p-12 text-center">
        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No revenue data available</p>
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
      {/* Revenue Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/20 rounded-lg"><Coins className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Coins Sold</p>
              <p className="text-xl font-bold">{revenue.revenue.totalCoinsSold.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-lg"><DollarSign className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Total Revenue</p>
              <p className="text-xl font-bold">${revenue.revenue.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-500" /></div>
            <div>
              <p className="text-xs text-gray-400">This Month</p>
              <p className="text-xl font-bold">${revenue.revenue.monthRevenue.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 rounded-lg"><DollarSign className="w-5 h-5 text-cyan-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Platform Profit</p>
              <p className="text-xl font-bold">${revenue.revenue.platformProfit.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Time-Based Revenue */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4">Revenue Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">Today</p>
            <p className="text-2xl font-bold text-green-400">${revenue.revenue.todayRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{revenue.revenue.todayCoinsSold.toLocaleString()} coins</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">This Week</p>
            <p className="text-2xl font-bold text-blue-400">${revenue.revenue.weekRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{revenue.revenue.weekCoinsSold.toLocaleString()} coins</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-gray-400 mb-1">This Month</p>
            <p className="text-2xl font-bold text-purple-400">${revenue.revenue.monthRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{revenue.revenue.monthCoinsSold.toLocaleString()} coins</p>
          </div>
        </div>
      </GlassCard>

      {/* Creator Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Top Earners */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" /> Top Earners
          </h3>
          <div className="space-y-3">
            {revenue.leaderboard.topEarners.map((creator, index) => (
              <div key={creator.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push(`/${creator.username}`)}>
                <RankBadge index={index} />
                <CreatorAvatar avatarUrl={creator.avatarUrl} username={creator.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{creator.displayName || creator.username}</p>
                  <p className="text-xs text-gray-400">@{creator.username}</p>
                </div>
                <p className="text-sm font-bold text-green-400">{creator.earnings.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Most Followed */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Most Followed
          </h3>
          <div className="space-y-3">
            {revenue.leaderboard.topFollowed.map((creator, index) => (
              <div key={creator.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push(`/${creator.username}`)}>
                <RankBadge index={index} />
                <CreatorAvatar avatarUrl={creator.avatarUrl} username={creator.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{creator.displayName || creator.username}</p>
                  <p className="text-xs text-gray-400">@{creator.username}</p>
                </div>
                <p className="text-sm font-bold text-blue-400">{creator.followerCount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Most Active */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" /> Most Active
          </h3>
          <div className="space-y-3">
            {revenue.leaderboard.mostActive.map((creator, index) => (
              <div key={creator.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push(`/${creator.username}`)}>
                <RankBadge index={index} />
                <CreatorAvatar avatarUrl={creator.avatarUrl} username={creator.username} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{creator.displayName || creator.username}</p>
                  <p className="text-xs text-gray-400">@{creator.username}</p>
                </div>
                <p className="text-xs text-purple-400">
                  {creator.lastSeenAt ? new Date(creator.lastSeenAt).toLocaleDateString() : 'Never'}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Purchasers */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-500" /> Top Purchasers
          </h3>
          <div className="space-y-3">
            {revenue.leaderboard.topPurchasers?.map((purchaser, index) => (
              <div key={purchaser.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" onClick={() => router.push(`/${purchaser.username}`)}>
                <RankBadge index={index} />
                <CreatorAvatar avatarUrl={purchaser.avatarUrl} username={purchaser.username} gradient="from-cyan-500 to-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{purchaser.displayName || purchaser.username}</p>
                  <p className="text-xs text-gray-400 truncate">{purchaser.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-cyan-400">{purchaser.totalPurchased.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">{purchaser.purchaseCount} orders</p>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No purchases yet</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
