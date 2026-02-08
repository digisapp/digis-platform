'use client';

import Image from 'next/image';
import { LoadingSpinner, GlassCard } from '@/components/ui';
import { UserCheck, Wrench, Search, CheckCircle, XCircle } from 'lucide-react';

interface AdminToolsTabProps {
  // Repair
  repairing: boolean;
  repairResult: { creatorsWithIssues: number; totalFixed: number } | null;
  onRepairCreators: () => void;
  // Username tool
  userSearch: string;
  setUserSearch: (v: string) => void;
  foundUser: {
    id: string;
    email: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  } | null;
  newUsername: string;
  setNewUsername: (v: string) => void;
  usernameCheck: { available: boolean; reserved: boolean; reason: string | null } | null;
  searchingUser: boolean;
  checkingUsername: boolean;
  settingUsername: boolean;
  onSearchUser: () => void;
  onSetUsername: () => void;
}

export function AdminToolsTab({
  repairing, repairResult, onRepairCreators,
  userSearch, setUserSearch, foundUser, newUsername, setNewUsername,
  usernameCheck, searchingUser, checkingUsername, settingUsername,
  onSearchUser, onSetUsername,
}: AdminToolsTabProps) {
  return (
    <div className="space-y-6">
      {/* Set Username Tool */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-400" />
          Set Username
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Search for a user by email or username and assign them any username, including reserved ones.
        </p>

        {/* User Search */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 block mb-2">Find User</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchUser()}
              placeholder="Enter email or username..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={onSearchUser}
              disabled={searchingUser || !userSearch.trim()}
              className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {searchingUser ? <LoadingSpinner size="sm" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Found User */}
        {foundUser && (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold shrink-0">
                  {foundUser.avatarUrl ? (
                    <Image src={foundUser.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
                  ) : (
                    foundUser.username?.[0]?.toUpperCase() || foundUser.email[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{foundUser.displayName || foundUser.username || 'No name'}</p>
                  <p className="text-sm text-gray-400">{foundUser.email}</p>
                  <p className="text-xs text-gray-500">
                    Current: @{foundUser.username || '(no username)'} • {foundUser.role}
                  </p>
                </div>
              </div>

              {/* New Username Input */}
              <div className="space-y-3">
                <label className="text-sm text-gray-400 block">New Username</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <button
                    onClick={onSetUsername}
                    disabled={settingUsername || !newUsername.trim() || newUsername === foundUser.username}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {settingUsername ? <LoadingSpinner size="sm" /> : 'Set Username'}
                  </button>
                </div>

                {/* Username Check Result */}
                {checkingUsername && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <LoadingSpinner size="sm" />
                    Checking availability...
                  </div>
                )}
                {usernameCheck && !checkingUsername && (
                  <div className={`flex items-center gap-2 text-sm ${usernameCheck.available ? 'text-green-400' : 'text-yellow-400'}`}>
                    {usernameCheck.available ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Available
                        {usernameCheck.reserved && (
                          <span className="text-yellow-400 ml-2">
                            (Reserved: {usernameCheck.reason} - Admin can assign)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Already taken by another user</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Repair Creators Tool */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-purple-400" />
          Repair Creators
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Fix creators with missing wallets, incorrect counters, or other data issues.
        </p>
        <button
          onClick={onRepairCreators}
          disabled={repairing}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {repairing ? (
            <>
              <LoadingSpinner size="sm" />
              Repairing...
            </>
          ) : (
            <>
              <Wrench className="w-5 h-5" />
              Run Repair
            </>
          )}
        </button>
        {repairResult && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-gray-300">
              Checked creators: Found {repairResult.creatorsWithIssues} with issues, fixed {repairResult.totalFixed} problems.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
