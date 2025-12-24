'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { Users, UserCheck, Clock, CheckCircle, XCircle, Search, Shield, Star, TrendingUp, TrendingDown, BarChart3, Ban, Pause, Trash2, UserPlus, DollarSign, RefreshCw, Coins, CreditCard, Eye, Smartphone, Monitor, Tablet } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import dynamic from 'next/dynamic';

// Dynamic import recharts to reduce bundle size for non-admin pages
const AdminCharts = dynamic(() => import('@/components/charts/AdminCharts'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-digis-cyan"></div>
    </div>
  ),
});
import { AdminModal, AdminToast } from '@/components/ui/AdminModal';

interface Application {
  id: string;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'fan' | 'creator' | 'admin';
  isCreatorVerified: boolean;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  accountStatus: 'active' | 'suspended' | 'banned';
  storageUsed: number;
}

interface Stats {
  totalUsers: number;
  totalCreators: number;
  totalFans: number;
  totalAdmins: number;
  pendingApplications: number;
  pendingPayouts?: number;
  pendingPayoutAmount?: number;
  totalRevenue?: number;
  todaySignups?: number;
}

interface Analytics {
  signupsTimeline: Array<{ date: string; signups: number }>;
  roleDistribution: { fan: number; creator: number; admin: number };
  applicationStats: { pending: number; approved: number; rejected: number };
  contentTypes: Array<{ type: string; count: number }>;
  totalStats: Stats;
  growthRate: number;
  lastWeekSignups: number;
}

type MainTab = 'applications' | 'users' | 'analytics' | 'traffic' | 'payouts' | 'moderation' | 'revenue' | 'activity';

interface TrafficData {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    viewsGrowth: number;
    visitorsGrowth: number;
  };
  viewsByPageType: Array<{ pageType: string; views: number }>;
  viewsByDevice: Array<{ device: string; views: number }>;
  topPages: Array<{ path: string; views: number }>;
  topCreatorProfiles: Array<{ username: string; views: number }>;
  viewsTimeline: Array<{ date: string; views: number }>;
  range: string;
}

interface RevenueData {
  revenue: {
    totalCoinsSold: number;
    todayCoinsSold: number;
    weekCoinsSold: number;
    monthCoinsSold: number;
    totalTips: number;
    totalRevenue: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    platformProfit: number;
  };
  leaderboard: {
    topEarners: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreatorVerified: boolean;
      earnings: number;
      followerCount: number;
    }>;
    topFollowed: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreatorVerified: boolean;
      followerCount: number;
    }>;
    mostActive: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreatorVerified: boolean;
      lastSeenAt: string | null;
      followerCount: number;
    }>;
  };
}

interface CreatorActivityData {
  summary: {
    totalCreators: number;
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    inactive: number;
  };
  creators: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isCreatorVerified: boolean;
    lastSeenAt: string | null;
    followerCount: number;
    createdAt: string;
    activityStatus: 'active_today' | 'active_week' | 'active_month' | 'inactive';
    loginsToday: number;
    loginsThisWeek: number;
    loginsThisMonth: number;
    daysSinceLastSeen: number | null;
  }>;
}

interface MostBlockedUser {
  blockedId: string;
  blockCount: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

interface BlockRecord {
  id: string;
  blockedId: string;
  blockerId: string;
  reason: string | null;
  createdAt: string;
  blocker: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  blocked: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
}

interface StreamBanRecord {
  id: string;
  streamId: string;
  userId: string;
  bannedBy: string | null;
  reason: string | null;
  createdAt: string;
  bannedUser: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  bannedByUser: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  stream: { id: string; title: string; creatorId: string } | null;
}

interface ModerationData {
  mostBlockedUsers: MostBlockedUser[];
  recentBlocks: BlockRecord[];
  recentStreamBans: StreamBanRecord[];
  stats: {
    totalBlocks: number;
    totalStreamBans: number;
    usersBlockedByMultiple: number;
  };
}


export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('applications');

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'fan' | 'creator' | 'admin' | 'all'>('all');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState<'active' | 'suspended' | 'banned' | 'all'>('active');
  const [usersPage, setUsersPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const USERS_PER_PAGE = 50;

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Traffic state
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [trafficRange, setTrafficRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Moderation state
  const [moderation, setModeration] = useState<ModerationData | null>(null);
  const [moderationTab, setModerationTab] = useState<'blocked' | 'bans'>('blocked');

  // Revenue state
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  // Creator Activity state
  const [creatorActivity, setCreatorActivity] = useState<CreatorActivityData | null>(null);
  const [activityFilter, setActivityFilter] = useState<'all' | 'active_today' | 'active_week' | 'active_month' | 'inactive'>('all');

  // Cache flags to avoid refetching
  const [hasFetchedApplications, setHasFetchedApplications] = useState(false);
  const [hasFetchedUsers, setHasFetchedUsers] = useState(false);
  const [hasFetchedAnalytics, setHasFetchedAnalytics] = useState(false);
  const [hasFetchedTraffic, setHasFetchedTraffic] = useState(false);
  const [hasFetchedModeration, setHasFetchedModeration] = useState(false);
  const [hasFetchedRevenue, setHasFetchedRevenue] = useState(false);
  const [hasFetchedActivity, setHasFetchedActivity] = useState(false);

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'prompt' | 'danger' | 'success';
    icon: 'delete' | 'promote' | 'shield' | 'warning' | 'success';
    confirmText: string;
    placeholder?: string;
    requireInput?: string;
    onConfirm: (inputValue?: string) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    icon: 'warning',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  // Toast state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch data when tab changes (with caching)
  useEffect(() => {
    if (mainTab === 'applications' && !hasFetchedApplications) {
      fetchApplications();
    } else if (mainTab === 'users' && !hasFetchedUsers) {
      fetchUsers();
    } else if (mainTab === 'analytics' && !hasFetchedAnalytics) {
      fetchAnalytics();
    } else if (mainTab === 'traffic' && !hasFetchedTraffic) {
      fetchTraffic();
    } else if (mainTab === 'moderation' && !hasFetchedModeration) {
      fetchModeration();
    } else if (mainTab === 'revenue' && !hasFetchedRevenue) {
      fetchRevenue();
    } else if (mainTab === 'activity' && !hasFetchedActivity) {
      fetchCreatorActivity();
    }
  }, [mainTab]);

  // Refetch applications when status filter changes
  useEffect(() => {
    if (mainTab === 'applications') {
      fetchApplications();
    }
  }, [selectedStatus]);

  // Refetch users when filters change (with debounced search)
  useEffect(() => {
    if (mainTab === 'users' && hasFetchedUsers) {
      fetchUsers();
    }
  }, [selectedRole, selectedAccountStatus, debouncedSearch]);

  // Refetch traffic when range changes
  useEffect(() => {
    if (mainTab === 'traffic' && hasFetchedTraffic) {
      fetchTraffic(trafficRange);
    }
  }, [trafficRange]);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.status === 403) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Access check failed:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/applications?status=${selectedStatus}`);
      const data = await response.json();
      if (response.ok) {
        setApplications(data.applications || []);
        setHasFetchedApplications(true);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (page: number = 0) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedRole !== 'all') params.append('role', selectedRole);
      if (selectedAccountStatus !== 'all') params.append('status', selectedAccountStatus);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('limit', USERS_PER_PAGE.toString());
      params.append('offset', (page * USERS_PER_PAGE).toString());

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
        setTotalUsers(data.total || data.users?.length || 0);
        setUsersPage(page);
        setHasFetchedUsers(true);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchStats(),
        mainTab === 'applications' && fetchApplications(),
        mainTab === 'users' && fetchUsers(usersPage),
        mainTab === 'analytics' && fetchAnalytics(),
        mainTab === 'traffic' && fetchTraffic(),
        mainTab === 'moderation' && fetchModeration(),
        mainTab === 'revenue' && fetchRevenue(),
        mainTab === 'activity' && fetchCreatorActivity(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
        setHasFetchedAnalytics(true);
      } else {
        console.error('Analytics API error:', data.error);
        showToast(data.error || 'Failed to load analytics', 'error');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchModeration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/moderation');
      const data = await response.json();

      if (response.ok) {
        setModeration(data);
        setHasFetchedModeration(true);
      } else {
        console.error('Moderation API error:', data.error);
        showToast(data.error || 'Failed to load moderation data', 'error');
      }
    } catch (err) {
      console.error('Error fetching moderation:', err);
      showToast('Failed to load moderation data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/revenue');
      const data = await response.json();

      if (response.ok) {
        setRevenue(data);
        setHasFetchedRevenue(true);
      } else {
        console.error('Revenue API error:', data.error);
        showToast(data.error || 'Failed to load revenue data', 'error');
      }
    } catch (err) {
      console.error('Error fetching revenue:', err);
      showToast('Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/creator-activity');
      const data = await response.json();

      if (response.ok) {
        setCreatorActivity(data);
        setHasFetchedActivity(true);
      } else {
        console.error('Creator Activity API error:', data.error);
        showToast(data.error || 'Failed to load creator activity', 'error');
      }
    } catch (err) {
      console.error('Error fetching creator activity:', err);
      showToast('Failed to load creator activity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTraffic = async (range: '24h' | '7d' | '30d' = trafficRange) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/traffic?range=${range}`);
      const data = await response.json();

      if (response.ok) {
        setTraffic(data);
        setHasFetchedTraffic(true);
      } else {
        console.error('Traffic API error:', data.error);
        showToast(data.error || 'Failed to load traffic data', 'error');
      }
    } catch (err) {
      console.error('Error fetching traffic:', err);
      showToast('Failed to load traffic data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id: string) => {
    setModal({
      isOpen: true,
      title: 'Approve Creator',
      message: 'Approve this creator application?\n\nThey will gain access to creator features.',
      type: 'confirm',
      icon: 'promote',
      confirmText: 'Approve',
      onConfirm: async () => {
        closeModal();
        setProcessingId(id);
        try {
          const response = await fetch(`/api/admin/applications/${id}/approve`, {
            method: 'POST',
          });
          if (response.ok) {
            showToast('Application approved successfully!', 'success');
            fetchApplications();
            fetchStats();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to approve application', 'error');
          }
        } catch (err) {
          console.error('Error approving:', err);
          showToast('Failed to approve application', 'error');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const handleReject = (id: string) => {
    setModal({
      isOpen: true,
      title: 'Reject Application',
      message: 'Enter a reason for rejection (optional):',
      type: 'prompt',
      icon: 'warning',
      confirmText: 'Reject',
      placeholder: 'Rejection reason...',
      onConfirm: async (reason?: string) => {
        closeModal();
        setProcessingId(id);
        try {
          const response = await fetch(`/api/admin/applications/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || '' }),
          });
          if (response.ok) {
            showToast('Application rejected', 'success');
            fetchApplications();
            fetchStats();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to reject application', 'error');
          }
        } catch (err) {
          console.error('Error rejecting:', err);
          showToast('Failed to reject application', 'error');
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  const handleRoleChange = (userId: string, newRole: 'fan' | 'creator' | 'admin') => {
    const roleIcons: Record<string, 'promote' | 'shield' | 'warning'> = {
      creator: 'promote',
      admin: 'shield',
      fan: 'warning',
    };
    setModal({
      isOpen: true,
      title: `Change Role to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`,
      message: `Are you sure you want to change this user's role to ${newRole}?`,
      type: newRole === 'admin' ? 'danger' : 'confirm',
      icon: roleIcons[newRole] || 'warning',
      confirmText: 'Change Role',
      onConfirm: async () => {
        closeModal();
        try {
          const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
          });
          if (response.ok) {
            showToast('Role updated successfully', 'success');
            fetchUsers();
            fetchStats();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update role', 'error');
          }
        } catch (err) {
          console.error('Error updating role:', err);
          showToast('Failed to update role', 'error');
        }
      },
    });
  };

  const handleToggleVerification = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
      });
      if (response.ok) {
        showToast('Verification status updated', 'success');
        fetchUsers();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to update verification', 'error');
      }
    } catch (err) {
      console.error('Error updating verification:', err);
      showToast('Failed to update verification', 'error');
    }
  };

  const [pendingUsername, setPendingUsername] = useState<{ userId: string; currentUsername: string } | null>(null);

  const handleChangeUsername = (userId: string, currentUsername: string) => {
    setPendingUsername({ userId, currentUsername });
    setModal({
      isOpen: true,
      title: 'Change Username',
      message: `Enter new username for @${currentUsername}\n\nAs an admin, you can assign reserved names (brands, celebrities, etc.)`,
      type: 'prompt',
      icon: 'shield',
      confirmText: 'Change Username',
      placeholder: currentUsername,
      onConfirm: async (newUsername?: string) => {
        closeModal();
        if (!newUsername || newUsername === currentUsername) return;

        try {
          const response = await fetch('/api/admin/set-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              username: newUsername,
              verifyCreator: true,
            }),
          });
          const data = await response.json();
          if (response.ok) {
            const wasReserved = data.data?.wasReserved;
            showToast(
              wasReserved
                ? `Username updated to @${newUsername} (reserved name - user verified)`
                : `Username updated to @${newUsername}`,
              'success'
            );
            fetchUsers();
          } else {
            showToast(data.error || 'Failed to update username', 'error');
          }
        } catch (err) {
          console.error('Error updating username:', err);
          showToast('Failed to update username', 'error');
        }
        setPendingUsername(null);
      },
    });
  };

  const handleSuspendUser = (userId: string, action: 'suspend' | 'unsuspend') => {
    const isSuspend = action === 'suspend';
    setModal({
      isOpen: true,
      title: isSuspend ? 'Suspend User' : 'Unsuspend User',
      message: isSuspend
        ? 'Suspend this user account?\n\nThey will not be able to log in until unsuspended.'
        : 'Unsuspend this user account?\n\nThey will be able to log in again.',
      type: isSuspend ? 'danger' : 'confirm',
      icon: 'warning',
      confirmText: isSuspend ? 'Suspend' : 'Unsuspend',
      onConfirm: async () => {
        closeModal();
        try {
          const response = await fetch(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          });
          if (response.ok) {
            showToast(isSuspend ? 'User suspended' : 'User unsuspended', 'success');
            fetchUsers();
            fetchStats();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update account status', 'error');
          }
        } catch (err) {
          console.error('Error updating account status:', err);
          showToast('Failed to update account status', 'error');
        }
      },
    });
  };

  const handleDeleteUser = (userId: string) => {
    setModal({
      isOpen: true,
      title: 'Delete Account',
      message: 'This will permanently ban this user.\n\nThey will not be able to log in and this action cannot be undone.',
      type: 'danger',
      icon: 'delete',
      confirmText: 'Delete Account',
      requireInput: 'DELETE',
      onConfirm: async () => {
        closeModal();
        try {
          const response = await fetch(`/api/admin/users/${userId}/delete`, {
            method: 'POST',
          });
          if (response.ok) {
            showToast('User account has been banned', 'success');
            fetchUsers();
            fetchStats();
          } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete account', 'error');
          }
        } catch (err) {
          console.error('Error deleting account:', err);
          showToast('Failed to delete account', 'error');
        }
      },
    });
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center md:pl-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-digis-dark pb-24 md:pb-8 md:pl-20">
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Manage creator applications, users, and platform analytics</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 self-start"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-8">
            <GlassCard
              className="p-4 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('users');
                setSelectedRole('all');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Users</p>
                  <p className="text-xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('users');
                setSelectedRole('fan');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Fans</p>
                  <p className="text-xl font-bold">{stats.totalFans}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('users');
                setSelectedRole('creator');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Creators</p>
                  <p className="text-xl font-bold">{stats.totalCreators}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('applications');
                setSelectedStatus('pending');
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending Apps</p>
                  <p className="text-xl font-bold">{stats.pendingApplications}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-4 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setMainTab('payouts')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending Payouts</p>
                  <p className="text-xl font-bold">{stats.pendingPayouts || 0}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-2 md:gap-4 mb-6 border-b border-white/10 overflow-x-auto pb-px">
          <button
            onClick={() => setMainTab('applications')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'applications'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Applications
            {stats?.pendingApplications ? (
              <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                {stats.pendingApplications}
              </span>
            ) : null}
            {mainTab === 'applications' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('users')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'users'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Users
            {stats && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                {stats.totalUsers}
              </span>
            )}
            {mainTab === 'users' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('payouts')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'payouts'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Payouts
            {stats?.pendingPayouts ? (
              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                {stats.pendingPayouts}
              </span>
            ) : null}
            {mainTab === 'payouts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('analytics')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'analytics'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Analytics
            {mainTab === 'analytics' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('traffic')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'traffic'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Traffic
            {traffic?.summary && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                {traffic.summary.totalViews.toLocaleString()}
              </span>
            )}
            {mainTab === 'traffic' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('moderation')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'moderation'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Moderation
            {moderation?.stats?.usersBlockedByMultiple ? (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                {moderation.stats.usersBlockedByMultiple}
              </span>
            ) : null}
            {mainTab === 'moderation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('revenue')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'revenue'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Revenue
            {mainTab === 'revenue' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('activity')}
            className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
              mainTab === 'activity'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Activity
            {creatorActivity?.summary && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                {creatorActivity.summary.activeToday}
              </span>
            )}
            {mainTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => router.push('/admin/onboarding')}
            className="px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base text-gray-400 hover:text-white"
          >
            Onboarding
          </button>
        </div>

        {/* Applications Tab Content */}
        {mainTab === 'applications' && (
          <>
            {/* Status Filter Tabs */}
            <div className="flex gap-4 mb-6">
              {(['pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Applications List */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : applications.length === 0 ? (
                <GlassCard className="p-12 text-center">
                  <p className="text-gray-400">No {selectedStatus} applications</p>
                </GlassCard>
              ) : (
                applications.map((app) => (
                  <GlassCard key={app.id} className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
                      <div className="flex items-start gap-3 md:gap-4 flex-1">
                        {/* Avatar */}
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl md:text-2xl font-bold shrink-0">
                          {app.user.avatarUrl ? (
                            <img src={app.user.avatarUrl} alt={app.user.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            app.user.username?.[0]?.toUpperCase() || '?'
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg md:text-xl font-semibold truncate">{app.user.displayName || app.user.username}</h3>
                          </div>

                          <p className="text-xs md:text-sm text-gray-400 mb-3 truncate">
                            @{app.user.username} • {app.user.email}
                          </p>

                          {/* Social Links */}
                          <div className="flex flex-wrap gap-3 mb-3">
                            {app.instagramHandle && (
                              <a
                                href={`https://instagram.com/${app.instagramHandle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full text-pink-400 hover:bg-pink-500/30 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                                {app.instagramHandle}
                              </a>
                            )}
                            {app.tiktokHandle && (
                              <a
                                href={`https://tiktok.com/@${app.tiktokHandle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 border border-cyan-500/30 rounded-full text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                                {app.tiktokHandle}
                              </a>
                            )}
                            {!app.instagramHandle && !app.tiktokHandle && (
                              <span className="text-sm text-gray-500 italic">No social links provided</span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                            <button
                              onClick={() => router.push(`/${app.user.username}`)}
                              className="text-digis-cyan hover:underline"
                            >
                              View Profile
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {selectedStatus === 'pending' && (
                        <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={processingId === app.id}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={processingId === app.id}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </>
        )}

        {/* Users Tab Content */}
        {mainTab === 'users' && (
          <>
            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <GlassInput
                  type="text"
                  placeholder="Search by email, username, or display name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12"
                />
              </div>

              {/* Role Filter */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Filter by Role:</p>
                <div className="flex flex-wrap gap-2 md:gap-4">
                  {(['all', 'fan', 'creator', 'admin'] as const).map((role) => {
                    const getRoleCount = () => {
                      if (!stats) return null;
                      switch (role) {
                        case 'all': return stats.totalUsers;
                        case 'fan': return stats.totalFans;
                        case 'creator': return stats.totalCreators;
                        case 'admin': return stats.totalAdmins;
                        default: return null;
                      }
                    };
                    const count = getRoleCount();
                    return (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                          selectedRole === role
                            ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}s
                        {count !== null && (
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                            selectedRole === role
                              ? 'bg-white/20'
                              : 'bg-white/10'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account Status Filter */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Filter by Status:</p>
                <div className="flex flex-wrap gap-2 md:gap-4">
                  {(['active', 'suspended', 'banned', 'all'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedAccountStatus(status)}
                      className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${
                        selectedAccountStatus === status
                          ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : users.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No users found</p>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <GlassCard key={user.id} className="p-4 md:p-6 overflow-hidden">
                    <div className="flex flex-col gap-4 md:gap-6">
                      <div className="flex items-start gap-3 md:gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xl md:text-2xl font-bold shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.email?.[0]?.toUpperCase() || '?'
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg md:text-xl font-semibold truncate">{user.displayName || user.username}</h3>
                            {user.role === 'admin' && (
                              <span title="Admin">
                                <Shield className="w-4 h-4 text-red-500" />
                              </span>
                            )}
                            {user.isCreatorVerified && (
                              <span title="Verified Creator">
                                <Star className="w-4 h-4 text-yellow-500" />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="text-xs md:text-sm text-gray-400 truncate max-w-[200px] md:max-w-none">
                              @{user.username} • {user.email}
                            </p>
                            {/* Change Username Button */}
                            <button
                              onClick={() => handleChangeUsername(user.id, user.username)}
                              className="px-2 py-0.5 bg-digis-cyan/20 text-digis-cyan text-xs rounded hover:bg-digis-cyan/30 transition-colors hidden md:inline-block"
                              title="Change username (including reserved names)"
                            >
                              Edit
                            </button>
                            {/* Account Status Badge */}
                            {user.accountStatus === 'suspended' && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full flex items-center gap-1">
                                <Pause className="w-3 h-3" /> Suspended
                              </span>
                            )}
                            {user.accountStatus === 'banned' && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded-full flex items-center gap-1">
                                <Ban className="w-3 h-3" /> Banned
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <span>{user.followerCount} followers</span>
                            <span>{user.followingCount} following</span>
                            {user.role === 'creator' && (
                              <span className="text-digis-cyan">
                                {user.storageUsed > 0
                                  ? user.storageUsed >= 1073741824
                                    ? `${(user.storageUsed / 1073741824).toFixed(2)} GB`
                                    : user.storageUsed >= 1048576
                                      ? `${(user.storageUsed / 1048576).toFixed(1)} MB`
                                      : `${(user.storageUsed / 1024).toFixed(0)} KB`
                                  : '0 KB'
                                } storage
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 md:border-0 md:pt-0">
                        {/* Make Creator Button (for fans) */}
                        {user.role === 'fan' && user.accountStatus !== 'banned' && (
                          <button
                            onClick={() => handleRoleChange(user.id, 'creator')}
                            className="px-3 py-1.5 bg-gradient-to-r from-digis-cyan to-digis-pink hover:opacity-90 rounded-lg text-xs font-medium transition-all flex items-center gap-1 justify-center"
                          >
                            <UserPlus className="w-3 h-3" />
                            Make Creator
                          </button>
                        )}

                        {/* Role Badge & Changer */}
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                          className="px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs font-medium"
                          disabled={user.accountStatus === 'banned'}
                        >
                          <option value="fan">Fan</option>
                          <option value="creator">Creator</option>
                          <option value="admin">Admin</option>
                        </select>

                        {/* Verification Toggle (for creators) */}
                        {user.role === 'creator' && user.accountStatus !== 'banned' && (
                          <button
                            onClick={() => handleToggleVerification(user.id)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              user.isCreatorVerified
                                ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                                : 'bg-white/5 text-gray-400 border border-white/20'
                            }`}
                          >
                            {user.isCreatorVerified ? 'Verified' : 'Unverified'}
                          </button>
                        )}

                        {/* Suspend/Unsuspend Button */}
                        {user.accountStatus !== 'banned' && (
                          <button
                            onClick={() => handleSuspendUser(user.id, user.accountStatus === 'suspended' ? 'unsuspend' : 'suspend')}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 justify-center ${
                              user.accountStatus === 'suspended'
                                ? 'bg-green-500/20 text-green-500 border border-green-500/50 hover:bg-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500/30'
                            }`}
                          >
                            <Pause className="w-3 h-3" />
                            {user.accountStatus === 'suspended' ? 'Restore' : 'Suspend'}
                          </button>
                        )}

                        {/* Delete/Ban Button */}
                        {user.accountStatus !== 'banned' && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-2 py-1.5 bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}

                        {/* View Profile */}
                        <button
                          onClick={() => router.push(`/${user.username}`)}
                          className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}

                {/* Pagination */}
                {totalUsers > USERS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400">
                      Showing {usersPage * USERS_PER_PAGE + 1} - {Math.min((usersPage + 1) * USERS_PER_PAGE, totalUsers)} of {totalUsers} users
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchUsers(usersPage - 1)}
                        disabled={usersPage === 0 || loading}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchUsers(usersPage + 1)}
                        disabled={(usersPage + 1) * USERS_PER_PAGE >= totalUsers || loading}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Analytics Tab Content */}
        {mainTab === 'analytics' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Growth Rate</p>
                        <p className="text-3xl font-bold">{analytics.growthRate > 0 ? '+' : ''}{analytics.growthRate}%</p>
                      </div>
                      <div className={`p-3 rounded-lg ${analytics.growthRate >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {analytics.growthRate >= 0 ? (
                          <TrendingUp className="w-8 h-8 text-green-500" />
                        ) : (
                          <TrendingDown className="w-8 h-8 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">vs last 7 days</p>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-400">New Users (7 days)</p>
                        <p className="text-3xl font-bold">{analytics.lastWeekSignups}</p>
                      </div>
                      <div className="p-3 bg-blue-500/20 rounded-lg">
                        <Users className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">Recent signups</p>
                  </GlassCard>
                </div>

                {/* Charts - Dynamically loaded */}
                <AdminCharts analytics={analytics} />
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No analytics data available</p>
                <button
                  onClick={() => {
                    setHasFetchedAnalytics(false);
                    fetchAnalytics();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </GlassCard>
            )}
          </>
        )}

        {/* Traffic Tab Content */}
        {mainTab === 'traffic' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : traffic ? (
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
                        <p className="text-sm text-gray-400">Views per Visitor</p>
                        <p className="text-2xl font-bold">
                          {traffic.summary.uniqueVisitors > 0
                            ? (traffic.summary.totalViews / traffic.summary.uniqueVisitors).toFixed(1)
                            : '0'}
                        </p>
                      </div>
                      <div className="p-3 bg-pink-500/20 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-pink-400" />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Pages per session</p>
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

                {/* Views by Page Type */}
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

                {/* Top Pages and Top Creator Profiles */}
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
                          <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
                              <span className="font-medium">@{creator.username}</span>
                            </div>
                            <span className="text-gray-400 text-sm">{creator.views.toLocaleString()} views</span>
                          </div>
                        ))
                      )}
                    </div>
                  </GlassCard>
                </div>

                {/* Views Timeline */}
                {traffic.viewsTimeline.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Views Over Time</h3>
                    <div className="h-64 flex items-end gap-1">
                      {traffic.viewsTimeline.map((day, i) => {
                        const maxViews = Math.max(...traffic.viewsTimeline.map(d => d.views));
                        const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-gradient-to-t from-digis-cyan to-digis-pink rounded-t transition-all hover:opacity-80"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${day.views.toLocaleString()} views`}
                            />
                            <span className="text-[10px] text-gray-500 rotate-45 origin-left whitespace-nowrap">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No traffic data available</p>
                <button
                  onClick={() => {
                    setHasFetchedTraffic(false);
                    fetchTraffic();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </GlassCard>
            )}
          </>
        )}

        {/* Payouts Tab Content - Redirect to payouts page */}
        {mainTab === 'payouts' && (
          <div className="space-y-6">
            <GlassCard className="p-8 text-center">
              <CreditCard className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Payout Management</h3>
              <p className="text-gray-400 mb-6">
                View and process creator payout requests, manage banking details, and track payment history.
              </p>
              <button
                onClick={() => router.push('/admin/payouts')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all hover:scale-105"
              >
                Open Payout Dashboard
              </button>
            </GlassCard>
          </div>
        )}

        {/* Moderation Tab Content */}
        {mainTab === 'moderation' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : moderation ? (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-500/20 rounded-lg">
                        <Ban className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Blocks</p>
                        <p className="text-xl font-bold">{moderation.stats.totalBlocks}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-orange-500/20 rounded-lg">
                        <Ban className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Stream Bans</p>
                        <p className="text-xl font-bold">{moderation.stats.totalStreamBans}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-yellow-500/20 rounded-lg">
                        <Shield className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Users Blocked by 2+</p>
                        <p className="text-xl font-bold">{moderation.stats.usersBlockedByMultiple}</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Sub-tabs for Blocks vs Bans */}
                <div className="flex gap-4 border-b border-white/10 pb-px">
                  <button
                    onClick={() => setModerationTab('blocked')}
                    className={`px-4 py-2 font-medium transition-colors relative ${
                      moderationTab === 'blocked' ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Blocked Users
                    {moderationTab === 'blocked' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setModerationTab('bans')}
                    className={`px-4 py-2 font-medium transition-colors relative ${
                      moderationTab === 'bans' ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Stream Bans
                    {moderationTab === 'bans' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                </div>

                {/* Blocked Users Tab */}
                {moderationTab === 'blocked' && (
                  <div className="space-y-6">
                    {/* Most Blocked Users - Flagged */}
                    {moderation.mostBlockedUsers.filter(u => Number(u.blockCount) > 1).length > 0 && (
                      <GlassCard className="p-6 border-red-500/30">
                        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Flagged: Users Blocked by Multiple Creators
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                          These users have been blocked by more than one creator - may indicate problematic behavior.
                        </p>
                        <div className="space-y-3">
                          {moderation.mostBlockedUsers
                            .filter(u => Number(u.blockCount) > 1)
                            .map((user) => (
                              <div
                                key={user.blockedId}
                                className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/30"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg font-bold shrink-0">
                                    {user.avatarUrl ? (
                                      <img src={user.avatarUrl} alt={user.username || ''} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      user.username?.[0]?.toUpperCase() || '?'
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-white">
                                        {user.displayName || user.username || 'Unknown'}
                                      </p>
                                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        {user.blockCount} blocks
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-400">@{user.username} • {user.email}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => router.push(`/${user.username}`)}
                                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                                >
                                  View Profile
                                </button>
                              </div>
                            ))}
                        </div>
                      </GlassCard>
                    )}

                    {/* Recent Blocks */}
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Recent Blocks</h3>
                      {moderation.recentBlocks.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No blocks recorded</p>
                      ) : (
                        <div className="space-y-3">
                          {moderation.recentBlocks.map((block) => (
                            <div
                              key={block.id}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                {/* Blocker */}
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold">
                                    {block.blocker?.avatarUrl ? (
                                      <img src={block.blocker.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      block.blocker?.username?.[0]?.toUpperCase() || '?'
                                    )}
                                  </div>
                                  <span className="text-sm text-white">@{block.blocker?.username || 'Unknown'}</span>
                                </div>

                                <span className="text-red-400 text-sm">blocked</span>

                                {/* Blocked */}
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-xs font-bold">
                                    {block.blocked?.avatarUrl ? (
                                      <img src={block.blocked.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                      block.blocked?.username?.[0]?.toUpperCase() || '?'
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-300">@{block.blocked?.username || 'Unknown'}</span>
                                </div>
                              </div>

                              <div className="text-right">
                                {block.reason && (
                                  <p className="text-xs text-gray-500 mb-1">{block.reason}</p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {new Date(block.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  </div>
                )}

                {/* Stream Bans Tab */}
                {moderationTab === 'bans' && (
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Recent Stream Bans</h3>
                    {moderation.recentStreamBans.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No stream bans recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {moderation.recentStreamBans.map((ban) => (
                          <div
                            key={ban.id}
                            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              {/* Banned User */}
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-xs font-bold">
                                  {ban.bannedUser?.avatarUrl ? (
                                    <img src={ban.bannedUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    ban.bannedUser?.username?.[0]?.toUpperCase() || '?'
                                  )}
                                </div>
                                <span className="text-sm text-gray-300">@{ban.bannedUser?.username || 'Unknown'}</span>
                              </div>

                              <span className="text-orange-400 text-sm">banned from</span>

                              {/* Stream */}
                              <span className="text-sm text-white truncate max-w-[200px]">
                                {ban.stream?.title || 'Unknown Stream'}
                              </span>

                              {ban.bannedByUser && (
                                <>
                                  <span className="text-gray-500 text-sm">by</span>
                                  <span className="text-sm text-cyan-400">@{ban.bannedByUser.username}</span>
                                </>
                              )}
                            </div>

                            <div className="text-right">
                              {ban.reason && (
                                <p className="text-xs text-gray-500 mb-1">{ban.reason}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(ban.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                )}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Ban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No moderation data available</p>
                <button
                  onClick={() => {
                    setHasFetchedModeration(false);
                    fetchModeration();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </GlassCard>
            )}
          </>
        )}

        {/* Revenue Tab Content */}
        {mainTab === 'revenue' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : revenue ? (
              <div className="space-y-6">
                {/* Revenue Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-500/20 rounded-lg">
                        <Coins className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Coins Sold</p>
                        <p className="text-xl font-bold">{revenue.revenue.totalCoinsSold.toLocaleString()}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-lg">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Revenue</p>
                        <p className="text-xl font-bold">${revenue.revenue.totalRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">This Month</p>
                        <p className="text-xl font-bold">${revenue.revenue.monthRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-cyan-500/20 rounded-lg">
                        <DollarSign className="w-5 h-5 text-cyan-500" />
                      </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Earners */}
                  <GlassCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      Top Earners
                    </h3>
                    <div className="space-y-3">
                      {revenue.leaderboard.topEarners.map((creator, index) => (
                        <div
                          key={creator.id}
                          className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => router.push(`/${creator.username}`)}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-300 text-black' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-white/10 text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold shrink-0">
                            {creator.avatarUrl ? (
                              <img src={creator.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              creator.username?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
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
                      <Users className="w-5 h-5 text-blue-500" />
                      Most Followed
                    </h3>
                    <div className="space-y-3">
                      {revenue.leaderboard.topFollowed.map((creator, index) => (
                        <div
                          key={creator.id}
                          className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => router.push(`/${creator.username}`)}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-300 text-black' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-white/10 text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold shrink-0">
                            {creator.avatarUrl ? (
                              <img src={creator.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              creator.username?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
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
                      <Clock className="w-5 h-5 text-purple-500" />
                      Most Active
                    </h3>
                    <div className="space-y-3">
                      {revenue.leaderboard.mostActive.map((creator, index) => (
                        <div
                          key={creator.id}
                          className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => router.push(`/${creator.username}`)}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-300 text-black' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-white/10 text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold shrink-0">
                            {creator.avatarUrl ? (
                              <img src={creator.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              creator.username?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
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
                </div>
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No revenue data available</p>
                <button
                  onClick={() => {
                    setHasFetchedRevenue(false);
                    fetchRevenue();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </GlassCard>
            )}
          </>
        )}

        {/* Creator Activity Tab Content */}
        {mainTab === 'activity' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : creatorActivity ? (
              <div className="space-y-6">
                {/* Activity Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-lg">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Creators</p>
                        <p className="text-xl font-bold">{creatorActivity.summary.totalCreators}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="p-4 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setActivityFilter('active_today')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Active Today</p>
                        <p className="text-xl font-bold text-green-400">{creatorActivity.summary.activeToday}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="p-4 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setActivityFilter('active_week')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-cyan-500/20 rounded-lg">
                        <Clock className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Active This Week</p>
                        <p className="text-xl font-bold text-cyan-400">{creatorActivity.summary.activeThisWeek}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="p-4 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setActivityFilter('active_month')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/20 rounded-lg">
                        <Clock className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Active This Month</p>
                        <p className="text-xl font-bold text-purple-400">{creatorActivity.summary.activeThisMonth}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard
                    className="p-4 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setActivityFilter('inactive')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-red-500/20 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Inactive</p>
                        <p className="text-xl font-bold text-red-400">{creatorActivity.summary.inactive}</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active_today', 'active_week', 'active_month', 'inactive'] as const).map((filter) => {
                    const labels: Record<typeof filter, string> = {
                      all: 'All Creators',
                      active_today: 'Active Today',
                      active_week: 'Active This Week',
                      active_month: 'Active This Month',
                      inactive: 'Inactive (30+ days)',
                    };
                    return (
                      <button
                        key={filter}
                        onClick={() => setActivityFilter(filter)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          activityFilter === filter
                            ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {labels[filter]}
                      </button>
                    );
                  })}
                </div>

                {/* Creator List */}
                <GlassCard className="p-4 md:p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Creator Activity</h3>
                  <div className="space-y-3">
                    {creatorActivity.creators
                      .filter(c => activityFilter === 'all' || c.activityStatus === activityFilter)
                      .map((creator) => (
                        <div
                          key={creator.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer gap-3 md:gap-4"
                          onClick={() => router.push(`/${creator.username}`)}
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-base md:text-lg font-bold shrink-0">
                              {creator.avatarUrl ? (
                                <img src={creator.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                creator.username?.[0]?.toUpperCase() || '?'
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white text-sm md:text-base truncate">{creator.displayName || creator.username}</p>
                                {creator.isCreatorVerified && (
                                  <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 shrink-0" />
                                )}
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
                    {creatorActivity.creators.filter(c => activityFilter === 'all' || c.activityStatus === activityFilter).length === 0 && (
                      <p className="text-gray-400 text-center py-8">No creators match this filter</p>
                    )}
                  </div>
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No activity data available</p>
                <button
                  onClick={() => {
                    setHasFetchedActivity(false);
                    fetchCreatorActivity();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </GlassCard>
            )}
          </>
        )}
      </div>

      {/* Admin Modal */}
      <AdminModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        icon={modal.icon}
        confirmText={modal.confirmText}
        placeholder={modal.placeholder}
        requireInput={modal.requireInput}
      />

      {/* Toast Notifications */}
      <AdminToast
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
