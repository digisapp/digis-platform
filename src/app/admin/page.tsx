'use client';

import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  Users, UserCheck, UserPlus, ClipboardList, CreditCard,
  RefreshCw, Mail, Gift,
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Manage creator applications, users, and platform analytics</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button onClick={() => d.router.push('/admin/community')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/30 rounded-lg transition-colors">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Community</span>
            </button>
            <button onClick={() => d.router.push('/admin/campaigns')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-orange-500/20 hover:from-pink-500/30 hover:to-orange-500/30 border border-pink-500/30 rounded-lg transition-colors">
              <Mail className="w-4 h-4 text-pink-400" />
              <span className="text-sm font-medium text-white">Campaigns</span>
            </button>
            <button onClick={() => d.router.push('/admin/creator-applications')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 rounded-lg transition-colors">
              <ClipboardList className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white">Applications</span>
            </button>
            <button onClick={() => d.router.push('/admin/share-rewards')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 rounded-lg transition-colors">
              <Gift className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white">Share Rewards</span>
            </button>
            <button onClick={() => d.router.push('/admin/referrals')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-lg transition-colors">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Referrals</span>
            </button>
            <button onClick={d.handleRefresh} disabled={d.refreshing} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${d.refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {d.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-8">
            <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => d.router.push('/admin/community')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 rounded-lg"><Users className="w-5 h-5 text-blue-500" /></div>
                <div><p className="text-xs text-gray-400">Total Users</p><p className="text-xl font-bold">{d.stats.totalUsers}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => d.router.push('/admin/community?tab=fans')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/20 rounded-lg"><Users className="w-5 h-5 text-cyan-500" /></div>
                <div><p className="text-xs text-gray-400">Fans</p><p className="text-xl font-bold">{d.stats.totalFans}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => d.router.push('/admin/community?tab=creators')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-lg"><UserCheck className="w-5 h-5 text-green-500" /></div>
                <div><p className="text-xs text-gray-400">Creators</p><p className="text-xl font-bold">{d.stats.totalCreators}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => d.router.push('/admin/community?filter=new')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-lg"><UserPlus className="w-5 h-5 text-green-500" /></div>
                <div><p className="text-xs text-gray-400">New Creators (7d)</p><p className="text-xl font-bold">{d.stats.weekSignups || 0}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => d.router.push('/admin/creator-applications')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-500/20 rounded-lg"><ClipboardList className="w-5 h-5 text-yellow-500" /></div>
                <div><p className="text-xs text-gray-400">Pending Applications</p><p className="text-xl font-bold">{d.stats.pendingApplications || 0}</p></div>
              </div>
            </GlassCard>
            <GlassCard className="p-4 cursor-pointer hover:scale-105 transition-transform" onClick={() => d.setMainTab('payouts')}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-lg"><CreditCard className="w-5 h-5 text-purple-500" /></div>
                <div><p className="text-xs text-gray-400">Pending Payouts</p><p className="text-xl font-bold">{d.stats.pendingPayouts || 0}</p></div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex gap-2 md:gap-4 mb-6 border-b border-white/10 overflow-x-auto pb-px">
          <TabButton label="New Creators" badge={d.stats?.weekSignups} badgeColor="green" onClick={() => d.router.push('/admin/community?filter=new')} />
          <TabButton label="Payouts" badge={d.stats?.pendingPayouts} badgeColor="purple" active={d.mainTab === 'payouts'} onClick={() => d.setMainTab('payouts')} />
          <TabButton label="Traffic" badge={d.traffic?.summary?.totalViews} badgeColor="cyan" active={d.mainTab === 'traffic'} onClick={() => d.setMainTab('traffic')} formatBadge />
          <TabButton label="Moderation" badge={d.moderation?.stats?.usersBlockedByMultiple} badgeColor="red" active={d.mainTab === 'moderation'} onClick={() => d.setMainTab('moderation')} />
          <TabButton label="Revenue" active={d.mainTab === 'revenue'} onClick={() => d.setMainTab('revenue')} />
          <TabButton label="Activity" badge={d.creatorActivity?.summary?.activeToday} badgeColor="green" active={d.mainTab === 'activity'} onClick={() => d.setMainTab('activity')} />
          <TabButton label="Tools" active={d.mainTab === 'tools'} onClick={() => d.setMainTab('tools')} />
          <TabButton label="Onboarding" onClick={() => d.router.push('/admin/onboarding')} />
        </div>

        {/* Tab Content */}
        {d.mainTab === 'traffic' && (
          <AdminTrafficTab loading={d.loading} traffic={d.traffic} trafficRange={d.trafficRange} setTrafficRange={d.setTrafficRange} onRetry={d.retryTraffic} />
        )}

        {d.mainTab === 'payouts' && (
          <div className="space-y-6">
            <GlassCard className="p-8 text-center">
              <CreditCard className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Payout Management</h3>
              <p className="text-gray-400 mb-6">View and process creator payout requests, manage banking details, and track payment history.</p>
              <button onClick={() => d.router.push('/admin/payouts')} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all hover:scale-105">
                Open Payout Dashboard
              </button>
            </GlassCard>
          </div>
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
      className={`px-3 md:px-6 py-3 font-semibold transition-colors relative whitespace-nowrap text-sm md:text-base ${
        active ? 'text-white' : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
      {badge ? (
        <span className={`ml-1.5 px-1.5 py-0.5 bg-${badgeColor}-500/20 text-${badgeColor}-400 text-xs rounded-full`}>
          {formatBadge ? badge.toLocaleString() : badge}
        </span>
      ) : null}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-digis-cyan to-digis-pink" />}
    </button>
  );
}
