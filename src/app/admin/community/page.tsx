'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  Users,
  UserCheck,
  Search,
  Shield,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Coins,
  TrendingUp,
  Heart,
  FileText,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Gift,
  Calendar,
  Radio,
  Clock,
  Ban,
  Sparkles,
  CreditCard,
  MoreVertical,
  ShieldCheck,
  ShieldOff,
  UserX,
  RefreshCw,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

interface Creator {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_creator_verified: boolean;
  follower_count: number;
  following_count: number;
  last_seen_at: string | null;
  account_status: 'active' | 'suspended' | 'banned';
  created_at: string;
  is_online: boolean;
  primary_category: string | null;
  balance: number;
  total_earned: number;
  content_count: number;
  last_post_at: string | null;
  total_streams: number;
  last_stream_at: string | null;
  active_subscribers: number;
  profile_completeness: number;
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
  block_count: number;
  unique_blockers: number;
  messages_sent: number;
  tips_count: number;
  total_tipped: number;
  last_purchase_at: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CREATOR_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'verified', label: 'Verified' },
  { key: 'unverified', label: 'Unverified' },
  { key: 'top_earners', label: 'Top Earners' },
  { key: 'new', label: 'New (7d)' },
  { key: 'inactive', label: 'Inactive (30d)' },
];

const FAN_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'top_spenders', label: 'Top Spenders' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'has_balance', label: 'Has Coins' },
  { key: 'new', label: 'New (7d)' },
  { key: 'inactive', label: 'Inactive (30d)' },
];

function AdminCommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'fans' ? 'fans' : 'creators';
  const [tab, setTab] = useState<'creators' | 'fans'>(initialTab);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'confirm';
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setFilter('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [tab, pagination.page, filter]);

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
        filter,
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
    const tiers: Record<string, { bg: string; text: string; label: string }> = {
      none: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'None' },
      bronze: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Bronze' },
      silver: { bg: 'bg-gray-400/20', text: 'text-gray-300', label: 'Silver' },
      gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Gold' },
      platinum: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Platinum' },
      diamond: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Diamond' },
    };
    const t = tiers[tier] || tiers.none;
    return (
      <span className={`px-2 py-0.5 ${t.bg} ${t.text} rounded-full text-xs font-medium`}>
        {t.label}
      </span>
    );
  };

  const getProfileBadge = (completeness: number) => {
    if (completeness >= 100) {
      return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">100%</span>;
    } else if (completeness >= 75) {
      return <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">{completeness}%</span>;
    } else if (completeness >= 50) {
      return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">{completeness}%</span>;
    } else {
      return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">{completeness}%</span>;
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleVerifyCreator = (userId: string, isCurrentlyVerified: boolean) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true,
      title: isCurrentlyVerified ? 'Remove Verification' : 'Verify Creator',
      message: isCurrentlyVerified
        ? 'Remove verification badge from this creator?'
        : 'Give this creator a verified badge?',
      type: 'confirm',
      confirmText: isCurrentlyVerified ? 'Remove' : 'Verify',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verified: !isCurrentlyVerified }),
          });
          if (response.ok) {
            showToast(isCurrentlyVerified ? 'Verification removed' : 'Creator verified', 'success');
            fetchData();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update verification', 'error');
          }
        } catch {
          showToast('Failed to update verification', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleSuspendUser = (userId: string, isCurrentlySuspended: boolean) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true,
      title: isCurrentlySuspended ? 'Unsuspend User' : 'Suspend User',
      message: isCurrentlySuspended
        ? 'Restore access to this user account?'
        : 'Suspend this user? They will not be able to log in.',
      type: isCurrentlySuspended ? 'confirm' : 'warning',
      confirmText: isCurrentlySuspended ? 'Unsuspend' : 'Suspend',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: isCurrentlySuspended ? 'unsuspend' : 'suspend' }),
          });
          if (response.ok) {
            showToast(isCurrentlySuspended ? 'User unsuspended' : 'User suspended', 'success');
            fetchData();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update user', 'error');
          }
        } catch {
          showToast('Failed to update user', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleDeleteUser = (userId: string) => {
    setActiveDropdown(null);
    setConfirmModal({
      show: true,
      title: 'Delete Account',
      message: 'Permanently ban this user? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}/delete`, {
            method: 'POST',
          });
          if (response.ok) {
            showToast('User deleted', 'success');
            fetchData();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete user', 'error');
          }
        } catch {
          showToast('Failed to delete user', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

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
                  <p className="text-2xl font-bold text-white">
                    {tab === 'creators' ? pagination.total : '--'}
                  </p>
                  <p className="text-xs text-gray-400">Creators</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {tab === 'fans' ? pagination.total : '--'}
                  </p>
                  <p className="text-xs text-gray-400">Fans</p>
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
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {fans.filter((f) => f.block_count > 0).length}
                  </p>
                  <p className="text-xs text-gray-400">Blocked Users</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab('creators')}
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
              onClick={() => setTab('fans')}
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

          {/* Quick Filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {(tab === 'creators' ? CREATOR_FILTERS : FAN_FILTERS).map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? tab === 'creators'
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
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
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Profile
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Last Post
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Streams
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Subs
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Actions
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
                        <td className="px-4 py-3 text-center">
                          {getProfileBadge(creator.profile_completeness)}
                        </td>
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
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {formatDate(creator.last_post_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Radio className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-white">{creator.total_streams}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-white">{creator.active_subscribers}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === creator.id ? null : creator.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {activeDropdown === creator.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/${creator.username}`);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  View Profile
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyCreator(creator.id, creator.is_creator_verified);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                                >
                                  {creator.is_creator_verified ? (
                                    <>
                                      <ShieldOff className="w-4 h-4 text-yellow-400" />
                                      Remove Verification
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                                      Verify Creator
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSuspendUser(creator.id, creator.account_status === 'suspended');
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                                >
                                  {creator.account_status === 'suspended' ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 text-green-400" />
                                      Unsuspend
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4 text-yellow-400" />
                                      Suspend
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(creator.id);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Account
                                </button>
                              </div>
                            )}
                          </div>
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
                        Last Seen
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Spent
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Following
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Messages
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Tips
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Last Buy
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Blocked
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {fans.map((fan) => (
                      <tr
                        key={fan.id}
                        className={`hover:bg-white/5 transition-colors ${
                          fan.block_count > 0 ? 'bg-red-500/5' : ''
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <MessageSquare className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-white">{fan.messages_sent}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Gift className="w-4 h-4 text-purple-400" />
                            <span className="text-sm text-white">{fan.tips_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{getSpendTierBadge(fan.spend_tier)}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">
                            {formatDate(fan.last_purchase_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {fan.block_count > 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                              <Ban className="w-3.5 h-3.5 text-red-400" />
                              <span className="text-sm font-bold text-red-400">
                                {fan.block_count}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown === fan.id ? null : fan.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            {activeDropdown === fan.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSuspendUser(fan.id, fan.account_status === 'suspended');
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                                >
                                  {fan.account_status === 'suspended' ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 text-green-400" />
                                      Unsuspend
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="w-4 h-4 text-yellow-400" />
                                      Suspend
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(fan.id);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Account
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              {confirmModal.type === 'danger' && (
                <div className="p-2 rounded-xl bg-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              )}
              {confirmModal.type === 'warning' && (
                <div className="p-2 rounded-xl bg-yellow-500/20">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                </div>
              )}
              {confirmModal.type === 'confirm' && (
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-gray-400 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : confirmModal.type === 'warning'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 ${
              toast.type === 'success'
                ? 'bg-green-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <AdminCommunityContent />
    </Suspense>
  );
}
