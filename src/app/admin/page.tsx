'use client';

import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  Users, UserCheck, UserPlus, ClipboardList,
  RefreshCw, Mail, Gift, MessageCircle, CreditCard,
  ChevronRight, Rocket,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { AdminModal, AdminToast } from '@/components/ui/AdminModal';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import {
  AdminTrafficTab,
  AdminModerationTab,
  AdminRevenueTab,
  AdminActivityTab,
  AdminToolsTab,
  AdminPayoutsTab,
} from '@/components/admin-dashboard';
import type { MainTab } from '@/components/admin-dashboard/types';

export default function AdminDashboard() {
  const d = useAdminDashboard();

  if (d.loading && !d.stats) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center md:pl-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-digis-dark pb-24 md:pb-8 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <button
            onClick={d.handleRefresh}
            disabled={d.refreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${d.refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Cards — 5 columns */}
        {d.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            <GlassCard className="p-4 cursor-pointer hover:scale-[1.03] transition-transform" onClick={() => d.router.push('/admin/community')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
                <div><p className="text-xs text-gray-400">Total Users</p><p className="text-xl font-bold">{d.stats.totalUsers}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-[1.03] transition-transform" onClick={() => d.router.push('/admin/community?tab=creators')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-lg"><UserCheck className="w-5 h-5 text-green-500" /></div>
                <div><p className="text-xs text-gray-400">Creators</p><p className="text-xl font-bold">{d.stats.totalCreators}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-[1.03] transition-transform" onClick={() => d.router.push('/admin/community?filter=new')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-lg"><UserPlus className="w-5 h-5 text-emerald-500" /></div>
                <div><p className="text-xs text-gray-400">New (7d)</p><p className="text-xl font-bold">{d.stats.weekSignups || 0}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-[1.03] transition-transform" onClick={() => d.router.push('/admin/creator-applications')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-500/20 rounded-lg"><ClipboardList className="w-5 h-5 text-yellow-500" /></div>
                <div><p className="text-xs text-gray-400">Applications</p><p className="text-xl font-bold">{d.stats.pendingApplications || 0}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-[1.03] transition-transform" onClick={() => d.setMainTab('payouts')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-lg"><CreditCard className="w-5 h-5 text-purple-500" /></div>
                <div><p className="text-xs text-gray-400">Payouts</p><p className="text-xl font-bold">{d.stats.pendingPayouts || 0}</p></div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Admin Pages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-8">
          {ADMIN_PAGES.map((page) => (
            <button
              key={page.label}
              onClick={() => d.router.push(page.path)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all group`}
            >
              <page.icon className={`w-4 h-4 ${page.color} flex-shrink-0`} />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">{page.label}</span>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-400 ml-auto flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 md:gap-2 mb-6 border-b border-white/10 overflow-x-auto pb-px">
          <TabButton label="Traffic" badge={d.traffic?.summary?.totalViews} badgeColor="cyan" active={d.mainTab === 'traffic'} onClick={() => d.setMainTab('traffic')} formatBadge />
          <TabButton label="Payouts" badge={d.stats?.pendingPayouts} badgeColor="purple" active={d.mainTab === 'payouts'} onClick={() => d.setMainTab('payouts')} />
          <TabButton label="Revenue" active={d.mainTab === 'revenue'} onClick={() => d.setMainTab('revenue')} />
          <TabButton label="Moderation" badge={d.moderation?.stats?.usersBlockedByMultiple} badgeColor="red" active={d.mainTab === 'moderation'} onClick={() => d.setMainTab('moderation')} />
          <TabButton label="Activity" badge={d.creatorActivity?.summary?.activeToday} badgeColor="green" active={d.mainTab === 'activity'} onClick={() => d.setMainTab('activity')} />
          <TabButton label="Tools" active={d.mainTab === 'tools'} onClick={() => d.setMainTab('tools')} />
        </div>

        {/* Tab Content */}
        {d.mainTab === 'traffic' && (
          <AdminTrafficTab loading={d.loading} traffic={d.traffic} trafficRange={d.trafficRange} setTrafficRange={d.setTrafficRange} onRetry={d.retryTraffic} />
        )}

        {d.mainTab === 'payouts' && (
          <AdminPayoutsTab loading={d.loading} payoutsData={d.payoutsData} onRetry={d.retryPayouts} />
        )}

        {d.mainTab === 'moderation' && (
          <AdminModerationTab loading={d.loading} moderation={d.moderation} moderationTab={d.moderationTab} setModerationTab={d.setModerationTab} onRetry={d.retryModeration} />
        )}

        {d.mainTab === 'revenue' && (
          <AdminRevenueTab loading={d.loading} revenue={d.revenue} onRetry={d.retryRevenue} />
        )}

        {d.mainTab === 'activity' && (
          <AdminActivityTab loading={d.loading} creatorActivity={d.creatorActivity} activityFilter={d.activityFilter} setActivityFilter={d.setActivityFilter} onRetry={d.retryActivity} />
        )}

        {d.mainTab === 'tools' && (
          <AdminToolsTab
            walletSearch={d.walletSearch} setWalletSearch={d.setWalletSearch} walletUser={d.walletUser}
            walletNewBalance={d.walletNewBalance} setWalletNewBalance={d.setWalletNewBalance}
            walletReason={d.walletReason} setWalletReason={d.setWalletReason}
            searchingWallet={d.searchingWallet} settingWallet={d.settingWallet}
            onSearchWalletUser={d.searchWalletUser} onSetWalletBalance={d.setWalletBalance}
            userSearch={d.userSearch} setUserSearch={d.setUserSearch} foundUser={d.foundUser}
            newUsername={d.newUsername} setNewUsername={d.setNewUsername} usernameCheck={d.usernameCheck}
            searchingUser={d.searchingUser} checkingUsername={d.checkingUsername} settingUsername={d.settingUsername}
            onSearchUser={d.searchUser} onSetUsername={d.setUsernameForUser}
          />
        )}
      </div>

      <AdminModal
        isOpen={d.modal.isOpen} onClose={d.closeModal} onConfirm={d.modal.onConfirm}
        title={d.modal.title} message={d.modal.message} type={d.modal.type}
        icon={d.modal.icon} confirmText={d.modal.confirmText}
        placeholder={d.modal.placeholder} requireInput={d.modal.requireInput}
      />
      <AdminToast
        isOpen={d.toast.isOpen}
        onClose={() => d.setToast(prev => ({ ...prev, isOpen: false }))}
        message={d.toast.message} type={d.toast.type}
      />
    </div>
  );
}

/* ── Admin Pages grid data ── */
const ADMIN_PAGES = [
  { label: 'Community', path: '/admin/community', icon: Users, color: 'text-purple-400' },
  { label: 'Applications', path: '/admin/creator-applications', icon: ClipboardList, color: 'text-green-400' },
  { label: 'Campaigns', path: '/admin/campaigns', icon: Mail, color: 'text-pink-400' },
  { label: 'Chats', path: '/admin/chats', icon: MessageCircle, color: 'text-blue-400' },
  { label: 'Referrals', path: '/admin/referrals', icon: Users, color: 'text-cyan-400' },
  { label: 'Share Rewards', path: '/admin/share-rewards', icon: Gift, color: 'text-yellow-400' },
  { label: 'Onboarding', path: '/admin/onboarding', icon: Rocket, color: 'text-orange-400' },
];

/* ── Tab button ── */
const BADGE_COLORS: Record<string, string> = {
  green: 'bg-green-500/20 text-green-400',
  purple: 'bg-purple-500/20 text-purple-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  red: 'bg-red-500/20 text-red-400',
};

function TabButton({ label, badge, badgeColor, active, onClick, formatBadge }: {
  label: string;
  badge?: number;
  badgeColor?: string;
  active?: boolean;
  onClick: () => void;
  formatBadge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 md:px-5 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
        active ? 'text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
      {badge ? (
        <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${badgeColor ? BADGE_COLORS[badgeColor] || '' : ''}`}>
          {formatBadge ? badge.toLocaleString() : badge}
        </span>
      ) : null}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />}
    </button>
  );
}
