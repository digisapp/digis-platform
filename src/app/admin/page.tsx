'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { Users, UserCheck, Clock, CheckCircle, XCircle, Search, Shield, Star, TrendingUp, TrendingDown, BarChart3, Ban, Pause, Trash2, UserPlus, DollarSign, RefreshCw, Coins, CreditCard } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdminModal, AdminToast } from '@/components/ui/AdminModal';

interface Application {
  id: string;
  displayName: string;
  bio: string;
  contentType: string;
  whyCreator: string;
  status: string;
  createdAt: string;
  user: {
    email: string;
    username: string;
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
}

interface Stats {
  totalUsers: number;
  totalCreators: number;
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

type MainTab = 'applications' | 'users' | 'analytics' | 'payouts';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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

  // Cache flags to avoid refetching
  const [hasFetchedApplications, setHasFetchedApplications] = useState(false);
  const [hasFetchedUsers, setHasFetchedUsers] = useState(false);
  const [hasFetchedAnalytics, setHasFetchedAnalytics] = useState(false);

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                  <GlassCard key={app.id} className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{app.displayName}</h3>
                          <span className="px-2 py-1 bg-digis-cyan/20 text-digis-cyan text-xs rounded-full">
                            {app.contentType}
                          </span>
                        </div>

                        <p className="text-sm text-gray-400 mb-1">
                          @{app.user.username} • {app.user.email}
                        </p>

                        <p className="text-sm text-gray-300 mb-3">{app.bio}</p>

                        <div className="text-sm text-gray-400 mb-3">
                          <strong>Why Creator:</strong> {app.whyCreator}
                        </div>

                        <p className="text-xs text-gray-500">
                          Applied {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      {selectedStatus === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={processingId === app.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            disabled={processingId === app.id}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
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
                <div className="flex gap-4">
                  {(['all', 'fan', 'creator', 'admin'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedRole === role
                          ? 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Status Filter */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Filter by Status:</p>
                <div className="flex gap-4">
                  {(['active', 'suspended', 'banned', 'all'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedAccountStatus(status)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
                  <GlassCard key={user.id} className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-2xl font-bold shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.email[0].toUpperCase()
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold">{user.displayName || user.username}</h3>
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
                            <p className="text-sm text-gray-400">
                              @{user.username} • {user.email}
                            </p>
                            {/* Change Username Button */}
                            <button
                              onClick={() => handleChangeUsername(user.id, user.username)}
                              className="px-2 py-0.5 bg-digis-cyan/20 text-digis-cyan text-xs rounded hover:bg-digis-cyan/30 transition-colors"
                              title="Change username (including reserved names)"
                            >
                              Edit Username
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
                          </div>

                          <p className="text-xs text-gray-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-[160px]">
                        {/* Make Creator Button (for fans) */}
                        {user.role === 'fan' && user.accountStatus !== 'banned' && (
                          <button
                            onClick={() => handleRoleChange(user.id, 'creator')}
                            className="px-3 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink hover:opacity-90 rounded-lg text-sm font-medium transition-all flex items-center gap-2 justify-center"
                          >
                            <UserPlus className="w-4 h-4" />
                            Make Creator
                          </button>
                        )}

                        {/* Role Badge & Changer */}
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm font-medium"
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
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 justify-center ${
                              user.accountStatus === 'suspended'
                                ? 'bg-green-500/20 text-green-500 border border-green-500/50 hover:bg-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500/30'
                            }`}
                          >
                            <Pause className="w-3 h-3" />
                            {user.accountStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}
                          </button>
                        )}

                        {/* Delete/Ban Button */}
                        {user.accountStatus !== 'banned' && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-2 bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}

                        {/* View Profile */}
                        <button
                          onClick={() => router.push(`/${user.username}`)}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                        >
                          View Profile
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

                {/* User Signups Timeline */}
                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-digis-cyan" />
                    User Signups (Last 30 Days)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.signupsTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af' }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#f3f4f6' }}
                      />
                      <Line type="monotone" dataKey="signups" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </GlassCard>

                {/* Role Distribution & Application Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold mb-4">User Role Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Fans', value: analytics.roleDistribution.fan },
                            { name: 'Creators', value: analytics.roleDistribution.creator },
                            { name: 'Admins', value: analytics.roleDistribution.admin },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1, 2].map((index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Application Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { status: 'Pending', count: analytics.applicationStats.pending },
                        { status: 'Approved', count: analytics.applicationStats.approved },
                        { status: 'Rejected', count: analytics.applicationStats.rejected },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="status" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                        <Bar dataKey="count" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </div>

                {/* Content Types */}
                {analytics.contentTypes.length > 0 && (
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Popular Content Types</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.contentTypes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="type" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                        <Bar dataKey="count" fill="#ec4899" />
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                )}
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
