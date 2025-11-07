'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Users, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';

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

interface Stats {
  totalUsers: number;
  totalCreators: number;
  pendingApplications: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchStats();
    fetchApplications();
  }, [selectedStatus]);

  const checkAdminAccess = async () => {
    // Will be redirected by middleware if not admin, but double check
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
      const response = await fetch(`/api/admin/applications?status=${selectedStatus}`);
      const data = await response.json();
      if (response.ok) {
        setApplications(data.applications);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
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
    if (reason === null) return; // User cancelled

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

  if (loading) {
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
          <p className="text-gray-400">Manage creator applications and users</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard
              className="p-6 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => router.push('/admin/users')}
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
              onClick={() => router.push('/admin/users?role=creator')}
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
              onClick={() => setSelectedStatus('pending')}
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

        {/* Filter Tabs */}
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
          {applications.length === 0 ? (
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
      </div>
    </div>
  );
}
