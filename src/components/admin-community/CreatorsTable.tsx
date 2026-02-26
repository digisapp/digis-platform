'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Shield, Coins, TrendingUp, Heart, FileText,
  Radio, Sparkles, Eye, EyeOff, MoreVertical,
  ShieldCheck, ShieldOff, UserX, RefreshCw, Trash2, ExternalLink, Bot,
  ChevronUp, ChevronDown, ArrowUpDown,
} from 'lucide-react';
import type { Creator } from './types';

type SortKey = 'created_at' | 'profile_completeness' | 'last_seen_at' | 'balance' | 'total_earned' | 'follower_count' | 'content_count' | 'last_post_at' | 'total_streams' | 'active_subscribers' | 'profile_views' | 'referral_count';
type SortDir = 'asc' | 'desc';

function getProfileBadge(completeness: number) {
  if (completeness >= 100) {
    return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">100%</span>;
  } else if (completeness >= 75) {
    return <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">{completeness}%</span>;
  } else if (completeness >= 50) {
    return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">{completeness}%</span>;
  } else {
    return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">{completeness}%</span>;
  }
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 text-gray-600 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-cyan-400 ml-1 inline" />
    : <ChevronDown className="w-3 h-3 text-cyan-400 ml-1 inline" />;
}

interface CreatorsTableProps {
  creators: Creator[];
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  formatDate: (dateString: string | null) => string;
  formatCoins: (coins: number) => string;
  onVerify: (userId: string, isVerified: boolean) => void;
  onHide: (userId: string, isHidden: boolean) => void;
  onSuspend: (userId: string, isSuspended: boolean) => void;
  onDelete: (userId: string) => void;
  onChangeRole: (userId: string, currentRole: string, newRole: 'fan' | 'creator' | 'admin') => void;
  onOpenAiSettings: (creatorId: string, creatorUsername: string) => void;
}

export function CreatorsTable({
  creators, activeDropdown, setActiveDropdown,
  formatDate, formatCoins,
  onVerify, onHide, onSuspend, onDelete, onChangeRole, onOpenAiSettings,
}: CreatorsTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return creators;
    return [...creators].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Handle nulls — push nulls to bottom
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // Date strings
      if (typeof av === 'string' && typeof bv === 'string') {
        const diff = new Date(av).getTime() - new Date(bv).getTime();
        return sortDir === 'asc' ? diff : -diff;
      }
      // Numbers
      const diff = (av as number) - (bv as number);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [creators, sortKey, sortDir]);

  const thClass = 'px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors select-none whitespace-nowrap';

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Creator</th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort('created_at')}>Joined<SortIcon column="created_at" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-center ${thClass}`} onClick={() => handleSort('profile_completeness')}>Profile<SortIcon column="profile_completeness" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort('last_seen_at')}>Last Seen<SortIcon column="last_seen_at" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('balance')}>Balance<SortIcon column="balance" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('total_earned')}>Earned<SortIcon column="total_earned" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('follower_count')}>Followers<SortIcon column="follower_count" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('content_count')}>Content<SortIcon column="content_count" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort('last_post_at')}>Last Post<SortIcon column="last_post_at" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('total_streams')}>Streams<SortIcon column="total_streams" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('active_subscribers')}>Subs<SortIcon column="active_subscribers" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('profile_views')}>Traffic<SortIcon column="profile_views" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort('referral_count')}>Referrals<SortIcon column="referral_count" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((creator) => (
              <tr
                key={creator.id}
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => router.push(`/${creator.username}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt={creator.username} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-purple-400 font-semibold">{creator.username?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                      )}
                      {creator.is_online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white">@{creator.username}</span>
                        {creator.is_creator_verified && <Shield className="w-4 h-4 text-cyan-400" />}
                      </div>
                      {creator.display_name && <span className="text-xs text-gray-500">{creator.display_name}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">{new Date(creator.created_at).toLocaleDateString()}</span>
                </td>
                <td className="px-4 py-3 text-center">{getProfileBadge(creator.profile_completeness)}</td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">{formatDate(creator.last_seen_at)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-white">{formatCoins(creator.balance)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-400">{formatCoins(creator.total_earned)}</span>
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
                  <span className="text-sm text-gray-400">{formatDate(creator.last_post_at)}</span>
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
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">{formatCoins(creator.profile_views)}</span>
                    </div>
                    {creator.views_7d > 0 && (
                      <span className="text-xs text-gray-500">+{creator.views_7d} this week</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${creator.referral_count > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {creator.referral_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === creator.id ? null : creator.id); }}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                      aria-label={`Actions for ${creator.username}`}
                      aria-haspopup="true"
                      aria-expanded={activeDropdown === creator.id}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {activeDropdown === creator.id && (
                      <div data-dropdown-menu className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/${creator.username}`); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" /> View Profile
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onVerify(creator.id, creator.is_creator_verified); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          {creator.is_creator_verified ? (<><ShieldOff className="w-4 h-4 text-yellow-400" /> Remove Verification</>) : (<><ShieldCheck className="w-4 h-4 text-cyan-400" /> Verify Creator</>)}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onHide(creator.id, creator.is_hidden_from_discovery); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          {creator.is_hidden_from_discovery ? (<><Eye className="w-4 h-4 text-green-400" /> Show in Discovery</>) : (<><EyeOff className="w-4 h-4 text-orange-400" /> Hide from Discovery</>)}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onSuspend(creator.id, creator.account_status === 'suspended'); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          {creator.account_status === 'suspended' ? (<><RefreshCw className="w-4 h-4 text-green-400" /> Unsuspend</>) : (<><UserX className="w-4 h-4 text-yellow-400" /> Suspend</>)}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onOpenAiSettings(creator.id, creator.username || ''); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          <Bot className="w-4 h-4 text-purple-400" /> AI Twin Settings
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onChangeRole(creator.id, 'creator', 'fan'); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          <Users className="w-4 h-4 text-cyan-400" /> Change to Fan
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onChangeRole(creator.id, 'creator', 'admin'); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-400" /> Make Admin
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onDelete(creator.id); }} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
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

      {creators.length === 0 && (
        <div className="py-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No creators found</p>
        </div>
      )}
    </div>
  );
}
