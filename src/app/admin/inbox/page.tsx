'use client';

import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  ArrowLeft, Search, Plus, RefreshCw, Inbox, Send,
  ChevronLeft, ChevronRight, CheckSquare, Trash2, Mail, Bot,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useAdminInbox } from '@/hooks/useAdminInbox';
import { EmailList, EmailDetailView, ComposeModal } from '@/components/admin-inbox';

export default function AdminInboxPage() {
  const d = useAdminInbox();
  const hasBulkSelection = d.selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="max-w-7xl mx-auto">
        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => d.router.push('/admin')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Back to admin dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Email Inbox</h1>
                <p className="text-gray-400 text-sm">Manage incoming &amp; outgoing emails</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-reply toggle */}
              {!d.autoReplyLoading && (
                <button
                  onClick={d.toggleAutoReply}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    d.autoReplyEnabled
                      ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                      : 'bg-white/5 border-white/10 text-gray-500'
                  }`}
                  title={d.autoReplyEnabled ? 'AI auto-reply is ON' : 'AI auto-reply is OFF'}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Auto-Reply</span>
                  <div className={`w-7 h-4 rounded-full relative transition-colors ${d.autoReplyEnabled ? 'bg-purple-500' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${d.autoReplyEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              )}
              <button
                onClick={d.refresh}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${d.loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => d.openCompose()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Compose</span>
              </button>
            </div>
          </div>

          {/* Tabs + Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => d.changeTab('inbox')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  d.tab === 'inbox' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Inbox className="w-4 h-4" />
                Inbox
                {d.unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
                    {d.unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => d.changeTab('sent')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  d.tab === 'sent' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Send className="w-4 h-4" />
                Sent
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={d.search}
                onChange={(e) => d.setSearch(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
              />
            </div>

            <p className="text-xs text-gray-500 sm:ml-auto">
              {d.total} {d.total === 1 ? 'email' : 'emails'}
            </p>
          </div>

          {/* Bulk action bar */}
          {hasBulkSelection && (
            <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm text-gray-300 font-medium">
                {d.selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={d.bulkMarkRead}
                  disabled={d.bulkActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Mark Read
                </button>
                <button
                  onClick={d.bulkDelete}
                  disabled={d.bulkActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                <button
                  onClick={d.clearSelection}
                  className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-gray-500 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Main Content — Split View on Desktop */}
          <GlassCard className="overflow-hidden min-h-[60vh]">
            <div className="flex h-[calc(100vh-280px)] md:h-[calc(100vh-260px)]">
              {/* Email List (left panel) */}
              <div className={`w-full md:w-[380px] md:border-r border-white/10 overflow-y-auto flex-shrink-0 ${
                d.selectedEmail ? 'hidden md:block' : ''
              }`}>
                {/* Select all */}
                {d.emails.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                    <button
                      onClick={d.selectAll}
                      className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      <CheckSquare className={`w-3.5 h-3.5 ${d.selectedIds.size === d.emails.length && d.emails.length > 0 ? 'text-cyan-400' : ''}`} />
                      {d.selectedIds.size === d.emails.length && d.emails.length > 0 ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                )}

                {d.loading ? (
                  <div className="flex items-center justify-center py-20">
                    <LoadingSpinner size="md" />
                  </div>
                ) : (
                  <>
                    <EmailList
                      emails={d.emails}
                      selectedId={d.selectedEmail?.id || null}
                      tab={d.tab}
                      onSelect={d.selectEmail}
                      onToggleStar={d.toggleStar}
                      selectedIds={d.selectedIds}
                      onToggleSelect={d.toggleSelect}
                      bulkMode={d.selectedIds.size > 0}
                    />

                    {/* Pagination */}
                    {d.totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                        <button
                          onClick={() => d.setPage(Math.max(1, d.page - 1))}
                          disabled={d.page <= 1}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-400" />
                        </button>
                        <span className="text-xs text-gray-500">
                          Page {d.page} of {d.totalPages}
                        </span>
                        <button
                          onClick={() => d.setPage(Math.min(d.totalPages, d.page + 1))}
                          disabled={d.page >= d.totalPages}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Email Detail (right panel) */}
              <div className={`flex-1 ${d.selectedEmail ? '' : 'hidden md:flex'}`}>
                {d.selectedEmail ? (
                  <EmailDetailView
                    email={d.selectedEmail}
                    thread={d.thread}
                    loading={d.detailLoading}
                    onBack={d.closeDetail}
                    onReply={() => d.openCompose(d.selectedEmail!)}
                    onToggleStar={d.toggleStar}
                    onMarkSpam={d.markSpam}
                    onDelete={d.deleteEmail}
                    onUseAiDraft={d.useAiDraft}
                    onEditAiDraft={d.editAiDraft}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                    <Inbox className="w-12 h-12 mb-3" />
                    <p className="text-sm font-medium">Select an email to read</p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={d.showCompose}
        compose={d.compose}
        setCompose={d.setCompose}
        sending={d.sending}
        onSend={d.handleSend}
        onClose={d.closeCompose}
      />
    </div>
  );
}
