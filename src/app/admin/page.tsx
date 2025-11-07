'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { Users, UserCheck, Clock, CheckCircle, XCircle, Search, Shield, Star, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
}

interface Stats {
  totalUsers: number;
  totalCreators: number;
  pendingApplications: number;
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

type MainTab = 'applications' | 'users' | 'analytics';

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
  const [selectedRole, setSelectedRole] = useState<'fan' | 'creator' | 'admin' | 'all'>('all');

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
  }, []);

  useEffect(() => {
    if (mainTab === 'applications') {
      fetchApplications();
    } else if (mainTab === 'users') {
      fetchUsers();
    } else if (mainTab === 'analytics') {
      fetchAnalytics();
    }
  }, [mainTab, selectedStatus, selectedRole, searchTerm]);

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
      console.log('[Admin] Applications response:', data);
      console.log('[Admin] Response status:', response.status);
      if (response.ok) {
        console.log('[Admin] Setting applications:', data.applications);
        setApplications(data.applications || []);
      } else {
        console.error('[Admin] Failed to fetch applications:', data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedRole !== 'all') params.append('role', selectedRole);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics');
      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this creator application?')) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/applications/${id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Application approved successfully!');
        fetchApplications();
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to approve application');
      }
    } catch (err) {
      console.error('Error approving:', err);
      alert('Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        alert('Application rejected');
        fetchApplications();
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject application');
      }
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'fan' | 'creator' | 'admin') => {
    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        alert('Role updated successfully');
        fetchUsers();
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role');
    }
  };

  const handleToggleVerification = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Verification status updated');
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update verification');
      }
    } catch (err) {
      console.error('Error updating verification:', err);
      alert('Failed to update verification');
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-digis-dark py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Manage creator applications, users, and platform analytics</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard
              className="p-6 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('users');
                setSelectedRole('all');
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-6 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('users');
                setSelectedRole('creator');
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Creators</p>
                  <p className="text-2xl font-bold">{stats.totalCreators}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className="p-6 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => {
                setMainTab('applications');
                setSelectedStatus('pending');
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pending Applications</p>
                  <p className="text-2xl font-bold">{stats.pendingApplications}</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/10">
          <button
            onClick={() => setMainTab('applications')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              mainTab === 'applications'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Creator Applications
            {mainTab === 'applications' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('users')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
              mainTab === 'users'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            User Management
            {mainTab === 'users' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />
            )}
          </button>
          <button
            onClick={() => setMainTab('analytics')}
            className={`px-6 py-3 font-semibold transition-colors relative ${
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

                          <p className="text-sm text-gray-400 mb-2">
                            @{user.username} • {user.email}
                          </p>

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
                      <div className="flex flex-col gap-2">
                        {/* Role Badge & Changer */}
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                          className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm font-medium"
                        >
                          <option value="fan">Fan</option>
                          <option value="creator">Creator</option>
                          <option value="admin">Admin</option>
                        </select>

                        {/* Verification Toggle (for creators) */}
                        {user.role === 'creator' && (
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

                        {/* View Profile */}
                        <button
                          onClick={() => router.push(`/profile/${user.username}`)}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                <p className="text-gray-400">No analytics data available</p>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
