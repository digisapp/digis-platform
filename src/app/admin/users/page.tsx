'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { Users, Search, ArrowLeft, Shield, Star } from 'lucide-react';

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

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleFilter = searchParams.get('role') as 'fan' | 'creator' | 'admin' | null;

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'fan' | 'creator' | 'admin' | 'all'>(roleFilter || 'all');

  useEffect(() => {
    fetchUsers();
  }, [selectedRole, searchTerm]);

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
      } else {
        console.error('Error fetching users:', data.error);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-digis-dark py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-gray-400">View and manage all platform users</p>
        </div>

        {/* Filters */}
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
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <AdminUsersContent />
    </Suspense>
  );
}
