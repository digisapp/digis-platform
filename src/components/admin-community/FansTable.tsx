'use client';

import {
  Users, Shield, Coins, TrendingUp, Heart,
  MessageSquare, Gift, Ban, MoreVertical,
  UserX, RefreshCw, Trash2, Star,
} from 'lucide-react';
import type { Fan } from './types';

function getSpendTierBadge(tier: string) {
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
}

interface FansTableProps {
  fans: Fan[];
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  formatDate: (dateString: string | null) => string;
  formatCoins: (coins: number) => string;
  onSuspend: (userId: string, isSuspended: boolean) => void;
  onDelete: (userId: string) => void;
  onChangeRole: (userId: string, currentRole: string, newRole: 'fan' | 'creator' | 'admin') => void;
}

export function FansTable({
  fans, activeDropdown, setActiveDropdown,
  formatDate, formatCoins,
  onSuspend, onDelete, onChangeRole,
}: FansTableProps) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Seen</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Spent</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Following</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Messages</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tips</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Buy</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Blocked</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {fans.map((fan) => (
              <tr
                key={fan.id}
                className={`hover:bg-white/5 transition-colors ${fan.block_count > 0 ? 'bg-red-500/5' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {fan.avatar_url ? (
                        <img src={fan.avatar_url} alt={fan.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <span className="text-cyan-400 font-semibold">{fan.username?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      {fan.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-white">@{fan.username}</span>
                      {fan.display_name && <p className="text-xs text-gray-500">{fan.display_name}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">{new Date(fan.created_at).toLocaleDateString()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">{formatDate(fan.last_seen_at)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-white">{formatCoins(fan.balance)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">{formatCoins(fan.total_spent)}</span>
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
                  <span className="text-sm text-gray-400">{formatDate(fan.last_purchase_at)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {fan.block_count > 0 ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                      <Ban className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-sm font-bold text-red-400">{fan.block_count}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === fan.id ? null : fan.id); }}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                      aria-label={`Actions for ${fan.username}`}
                      aria-haspopup="true"
                      aria-expanded={activeDropdown === fan.id}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {activeDropdown === fan.id && (
                      <div data-dropdown-menu className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); onSuspend(fan.id, fan.account_status === 'suspended'); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          {fan.account_status === 'suspended' ? (<><RefreshCw className="w-4 h-4 text-green-400" /> Unsuspend</>) : (<><UserX className="w-4 h-4 text-yellow-400" /> Suspend</>)}
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onChangeRole(fan.id, 'fan', 'creator'); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          <Star className="w-4 h-4 text-purple-400" /> Make Creator
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onChangeRole(fan.id, 'fan', 'admin'); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-400" /> Make Admin
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onDelete(fan.id); }} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" /> Delete Account
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
  );
}
