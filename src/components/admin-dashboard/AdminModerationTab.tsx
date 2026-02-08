'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { Ban, Shield } from 'lucide-react';
import type { ModerationData } from './types';

interface AdminModerationTabProps {
  loading: boolean;
  moderation: ModerationData | null;
  moderationTab: 'blocked' | 'bans';
  setModerationTab: (tab: 'blocked' | 'bans') => void;
  onRetry: () => void;
}

export function AdminModerationTab({ loading, moderation, moderationTab, setModerationTab, onRetry }: AdminModerationTabProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!moderation) {
    return (
      <GlassCard className="p-12 text-center">
        <Ban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No moderation data available</p>
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

      {/* Sub-tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-px">
        <button
          onClick={() => setModerationTab('blocked')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            moderationTab === 'blocked' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Blocked Users
          {moderationTab === 'blocked' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
        </button>
        <button
          onClick={() => setModerationTab('bans')}
          className={`px-4 py-2 font-medium transition-colors relative ${
            moderationTab === 'bans' ? 'text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Stream Bans
          {moderationTab === 'bans' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
        </button>
      </div>

      {/* Blocked Users Tab */}
      {moderationTab === 'blocked' && (
        <div className="space-y-6">
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
                    <div key={user.blockedId} className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg font-bold shrink-0">
                          {user.avatarUrl ? (
                            <Image src={user.avatarUrl} alt={user.username || ''} fill className="rounded-full object-cover" unoptimized />
                          ) : (
                            user.username?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{user.displayName || user.username || 'Unknown'}</p>
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{user.blockCount} blocks</span>
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

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Blocks</h3>
            {moderation.recentBlocks.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No blocks recorded</p>
            ) : (
              <div className="space-y-3">
                {moderation.recentBlocks.map((block) => (
                  <div key={block.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-xs font-bold">
                          {block.blocker?.avatarUrl ? (
                            <Image src={block.blocker.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
                          ) : (
                            block.blocker?.username?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <span className="text-sm text-white">@{block.blocker?.username || 'Unknown'}</span>
                      </div>
                      <span className="text-red-400 text-sm">blocked</span>
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-xs font-bold">
                          {block.blocked?.avatarUrl ? (
                            <Image src={block.blocked.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
                          ) : (
                            block.blocked?.username?.[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <span className="text-sm text-gray-300">@{block.blocked?.username || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {block.reason && <p className="text-xs text-gray-500 mb-1">{block.reason}</p>}
                      <p className="text-xs text-gray-500">{new Date(block.createdAt).toLocaleDateString()}</p>
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
                <div key={ban.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-xs font-bold">
                        {ban.bannedUser?.avatarUrl ? (
                          <Image src={ban.bannedUser.avatarUrl} alt="" fill className="rounded-full object-cover" unoptimized />
                        ) : (
                          ban.bannedUser?.username?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      <span className="text-sm text-gray-300">@{ban.bannedUser?.username || 'Unknown'}</span>
                    </div>
                    <span className="text-orange-400 text-sm">banned from</span>
                    <span className="text-sm text-white truncate max-w-[200px]">{ban.stream?.title || 'Unknown Stream'}</span>
                    {ban.bannedByUser && (
                      <>
                        <span className="text-gray-500 text-sm">by</span>
                        <span className="text-sm text-cyan-400">@{ban.bannedByUser.username}</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    {ban.reason && <p className="text-xs text-gray-500 mb-1">{ban.reason}</p>}
                    <p className="text-xs text-gray-500">{new Date(ban.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
