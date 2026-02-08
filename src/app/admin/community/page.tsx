'use client';

import { Suspense } from 'react';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  Users, UserCheck, Search, ArrowLeft, AlertTriangle,
  CheckCircle, Ban, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useAdminCommunity } from '@/hooks/useAdminCommunity';
import { CreatorsTable, FansTable, CommunityModals, CREATOR_FILTERS, FAN_FILTERS } from '@/components/admin-community';

function AdminCommunityContent() {
  const c = useAdminCommunity();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-7xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => c.router.push('/admin')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Back to admin dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Community</h1>
                <p className="text-gray-400 text-sm">Manage creators and fans</p>
              </div>
            </div>
            <button
              onClick={c.handleSyncCounts}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 text-sm text-gray-400 hover:text-white"
              title="Sync follower counts, spending, and offline status"
              aria-label="Sync follower counts, spending, and offline status"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">Sync Counts</span>
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20"><UserCheck className="w-5 h-5 text-purple-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{c.creatorsTotal > 0 ? c.creatorsTotal.toLocaleString() : (c.tab === 'creators' ? '0' : '--')}</p>
                  <p className="text-xs text-gray-400">Creators</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20"><Users className="w-5 h-5 text-cyan-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{c.fansTotal > 0 ? c.fansTotal.toLocaleString() : (c.tab === 'fans' ? '0' : '--')}</p>
                  <p className="text-xs text-gray-400">Fans</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/20"><CheckCircle className="w-5 h-5 text-green-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {c.tab === 'creators' ? c.creators.filter((cr) => cr.is_online).length : c.fans.filter((f) => f.is_online).length}
                  </p>
                  <p className="text-xs text-gray-400">Online Now</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20"><Ban className="w-5 h-5 text-red-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{c.fans.filter((f) => f.block_count > 0).length}</p>
                  <p className="text-xs text-gray-400">Blocked Users</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => c.setTab('creators')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${c.tab === 'creators' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              <UserCheck className="w-4 h-4" /> Creators
            </button>
            <button
              onClick={() => c.setTab('fans')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${c.tab === 'fans' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              <Users className="w-4 h-4" /> Fans
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {(c.tab === 'creators' ? CREATOR_FILTERS : FAN_FILTERS).map((f) => (
              <button
                key={f.key}
                onClick={() => { c.setFilter(f.key); c.setPagination((prev) => ({ ...prev, page: 1 })); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  c.filter === f.key
                    ? c.tab === 'creators' ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' : 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <label htmlFor="community-search" className="sr-only">Search {c.tab}</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              <input
                id="community-search"
                type="text"
                value={c.search}
                onChange={(e) => c.setSearch(e.target.value)}
                placeholder={`Search ${c.tab}...`}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
              />
            </div>
          </div>

          {/* Content */}
          {c.loading ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : c.fetchError ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white/5 rounded-2xl border border-white/10">
              <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-white font-medium mb-2">Failed to load data</p>
              <p className="text-gray-400 text-sm mb-4 text-center max-w-md">{c.fetchError}</p>
              <button onClick={() => c.fetchData()} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : c.tab === 'creators' ? (
            <CreatorsTable
              creators={c.creators}
              activeDropdown={c.activeDropdown}
              setActiveDropdown={c.setActiveDropdown}
              formatDate={c.formatDate}
              formatCoins={c.formatCoins}
              onVerify={c.handleVerifyCreator}
              onHide={c.handleHideFromDiscovery}
              onSuspend={c.handleSuspendUser}
              onDelete={c.handleDeleteUser}
              onChangeRole={c.handleChangeRole}
            />
          ) : (
            <FansTable
              fans={c.fans}
              activeDropdown={c.activeDropdown}
              setActiveDropdown={c.setActiveDropdown}
              formatDate={c.formatDate}
              formatCoins={c.formatCoins}
              onSuspend={c.handleSuspendUser}
              onDelete={c.handleDeleteUser}
              onChangeRole={c.handleChangeRole}
            />
          )}

          {/* Pagination */}
          {c.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">
                Showing {(c.pagination.page - 1) * c.pagination.limit + 1} -{' '}
                {Math.min(c.pagination.page * c.pagination.limit, c.pagination.total)} of {c.pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => c.setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={c.pagination.page === 1}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <span className="text-sm text-gray-400" aria-live="polite">
                  Page {c.pagination.page} of {c.pagination.totalPages}
                </span>
                <button
                  onClick={() => c.setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={c.pagination.page === c.pagination.totalPages}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CommunityModals
        confirmModal={c.confirmModal}
        onCloseConfirm={() => c.setConfirmModal(null)}
        toast={c.toast}
        onCloseToast={() => c.setToast(null)}
      />
    </div>
  );
}

export default function AdminCommunityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <AdminCommunityContent />
    </Suspense>
  );
}
