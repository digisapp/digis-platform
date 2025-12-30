'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import {
  Users,
  UserCheck,
  Search,
  Shield,
  Star,
  ArrowLeft,
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Coins,
  TrendingUp,
  Eye,
  Heart,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

interface Creator {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_creator_verified: boolean;
  follower_count: number;
  following_count: number;
  last_seen_at: string | null;
  account_status: 'active' | 'suspended' | 'banned';
  created_at: string;
  is_online: boolean;
  balance: number;
  total_earned: number;
  content_count: number;
}

interface Fan {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  following_count: number;
  last_seen_at: string | null;
  account_status: 'active' | 'suspended' | 'banned';
  lifetime_spending: number;
  spend_tier: string;
  created_at: string;
  is_online: boolean;
  balance: number;
  total_spent: number;
  report_count: number;
  unique_reporters: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminCommunityPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'creators' | 'fans'>('creators');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchData();
  }, [tab, pagination.page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      });

      const response = await fetch(`/api/admin/community?${params}`);
      const result = await response.json();

      if (response.ok) {
        if (tab === 'creators') {
          setCreators(result.data);
        } else {
          setFans(result.data);
        }
        setPagination((prev) => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch community data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatCoins = (coins: number) => {
    if (coins >= 1000000) return `${(coins / 1000000).toFixed(1)}M`;
    if (coins >= 1000) return `${(coins / 1000).toFixed(1)}K`;
    return coins.toString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
            Suspended
          </span>
        );
      case 'banned':
        return (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            Banned
          </span>
        );
      default:
        return null;
    }
  };

  const getSpendTierBadge = (tier: string) => {
    const tiers: Record<string, { color: string; label: string }> = {
      none: { color: 'gray', label: 'None' },
      bronze: { color: 'orange', label: 'Bronze' },
      silver: { color: 'gray', label: 'Silver' },
      gold: { color: 'yellow', label: 'Gold' },
      platinum: { color: 'cyan', label: 'Platinum' },
      diamond: { color: 'purple', label: 'Diamond' },
    };
    const t = tiers[tier] || tiers.none;
    return (
      <span
        className={`px-2 py-0.5 bg-${t.color}-500/20 text-${t.color}-400 rounded-full text-xs font-medium`}
        style={{
          backgroundColor:
            t.color === 'gray'
              ? 'rgba(156, 163, 175, 0.2)'
              : t.color === 'orange'
              ? 'rgba(249, 115, 22, 0.2)'
              : t.color === 'yellow'
              ? 'rgba(234, 179, 8, 0.2)'
              : t.color === 'cyan'
              ? 'rgba(6, 182, 212, 0.2)'
              : 'rgba(168, 85, 247, 0.2)',
          color:
            t.color === 'gray'
              ? '#9ca3af'
              : t.color === 'orange'
              ? '#f97316'
              : t.color === 'yellow'
              ? '#eab308'
              : t.color === 'cyan'
              ? '#06b6d4'
              : '#a855f7',
        }}
      >
        {t.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-7xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Community</h1>
              <p className="text-gray-400 text-sm">Manage creators and fans</p>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20">
                  <UserCheck className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tab === 'creators' ? pagination.total : creators.length || '--'}</p>
                  <p className="text-xs text-gray-400">Total Creators</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tab === 'fans' ? pagination.total : fans.length || '--'}</p>
                  <p className="text-xs text-gray-400">Total Fans</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tab === 'creators'
                      ? creators.filter((c) => c.is_online).length
                      : fans.filter((f) => f.is_online).length}
                  </p>
                  <p className="text-xs text-gray-400">Online Now</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {fans.filter((f) => f.report_count > 0).length}
                  </p>
                  <p className="text-xs text-gray-400">Reported Users</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setTab('creators');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                tab === 'creators'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Creators
            </button>
            <button
              onClick={() => {
                setTab('fans');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                tab === 'fans'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              Fans
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${tab}...`}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : tab === 'creators' ? (
            /* Creators Table */
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Creator
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Last Seen
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Earned
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Followers
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {creators.map((creator) => (
                      <tr
                        key={creator.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => router.push(`/${creator.username}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {creator.avatar_url ? (
                                <img
                                  src={creator.avatar_url}
                                  alt={creator.username}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                  <span className="text-purple-400 font-semibold">
                                    {creator.username?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                              {creator.is_online && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-white">
                                  {creator.display_name || creator.username}
                                </span>
                                {creator.is_creator_verified && (
                                  <Shield className="w-4 h-4 text-cyan-400" />
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{creator.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(creator.account_status)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {formatDate(creator.last_seen_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-white">
                              {formatCoins(creator.balance)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-green-400">
                              {formatCoins(creator.total_earned)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Heart className="w-4 h-4 text-pink-500" />
                            <span className="text-sm text-white">{creator.follower_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-white">{creator.content_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-400">
                            {new Date(creator.created_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {creators.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No creators found</p>
                </div>
              )}
            </div>
          ) : (
            /* Fans Table */
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Fan
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Last Seen
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Following
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Reports
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {fans.map((fan) => (
                      <tr
                        key={fan.id}
                        className={`hover:bg-white/5 transition-colors ${
                          fan.report_count > 0 ? 'bg-red-500/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {fan.avatar_url ? (
                                <img
                                  src={fan.avatar_url}
                                  alt={fan.username}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                  <span className="text-cyan-400 font-semibold">
                                    {fan.username?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                              {fan.is_online && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-white">
                                {fan.display_name || fan.username}
                              </span>
                              <p className="text-xs text-gray-500">{fan.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(fan.account_status)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {formatDate(fan.last_seen_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-white">
                              {formatCoins(fan.balance)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">
                              {formatCoins(fan.total_spent)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Heart className="w-4 h-4 text-pink-500" />
                            <span className="text-sm text-white">{fan.following_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{getSpendTierBadge(fan.spend_tier)}</td>
                        <td className="px-4 py-3 text-center">
                          {fan.report_count > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-sm font-bold text-red-400">
                                {fan.report_count}
                              </span>
                              <span className="text-xs text-red-400/70">
                                ({fan.unique_reporters} creators)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-400">
                            {new Date(fan.created_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {fans.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No fans found</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <span className="text-sm text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
