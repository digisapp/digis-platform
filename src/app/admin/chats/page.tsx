'use client';

import { Suspense } from 'react';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight, MessageCircle,
  AlertTriangle, RefreshCw, Lock, Image, DollarSign, Bot, Eye,
} from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useAdminChats } from '@/hooks/useAdminChats';

function AdminChatsContent() {
  const c = useAdminChats();

  // Message detail view
  if (c.selectedConversation && c.selectedParticipants) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
        <MobileHeader />
        <div className="max-w-5xl mx-auto">
          <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />
          <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={c.clearSelection}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-white truncate">
                  {c.selectedParticipants.user1.displayName || c.selectedParticipants.user1.username}
                  {' '}&amp;{' '}
                  {c.selectedParticipants.user2.displayName || c.selectedParticipants.user2.username}
                </h1>
                <p className="text-gray-400 text-sm">{c.messagesPagination.total} messages</p>
              </div>
            </div>

            {/* Participant Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[c.selectedParticipants.user1, c.selectedParticipants.user2].map((p) => (
                <GlassCard key={p.id} className="p-3 flex items-center gap-3">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-gray-400">
                      {(p.displayName || p.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{p.displayName || p.username}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">@{p.username}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${p.role === 'creator' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                        {p.role}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Messages */}
            {c.messagesLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <div className="space-y-3">
                {c.messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No messages found</div>
                ) : c.messages.map((msg) => {
                  const isUser1 = msg.sender.id === c.selectedParticipants!.user1.id;
                  return (
                    <div key={msg.id} className={`flex ${isUser1 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] ${isUser1 ? 'bg-white/5' : 'bg-blue-500/10'} rounded-2xl p-3 border ${isUser1 ? 'border-white/10' : 'border-blue-500/20'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-300">
                            {msg.sender.displayName || msg.sender.username}
                          </span>
                          {/* Type badges */}
                          {msg.messageType === 'tip' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-0.5">
                              <DollarSign className="w-3 h-3" />{msg.tipAmount}
                            </span>
                          )}
                          {msg.messageType === 'media' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-0.5">
                              <Image className="w-3 h-3" />media
                            </span>
                          )}
                          {msg.messageType === 'locked' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex items-center gap-0.5">
                              <Lock className="w-3 h-3" />{msg.unlockPrice}
                            </span>
                          )}
                          {msg.messageType === 'system' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400">system</span>
                          )}
                          {msg.isAiGenerated && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 flex items-center gap-0.5">
                              <Bot className="w-3 h-3" />AI
                            </span>
                          )}
                          {msg.isLocked && msg.messageType !== 'locked' && (
                            <Lock className="w-3 h-3 text-yellow-400" />
                          )}
                        </div>
                        <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{msg.content}</p>
                        {msg.mediaUrl && (
                          <div className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                            <Image className="w-3 h-3" />{msg.mediaType || 'attachment'}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1">{c.formatDate(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Messages Pagination */}
            {c.messagesPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-400">
                  Page {c.messagesPagination.page} of {c.messagesPagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => c.setMessagesPage(c.messagesPagination.page - 1)}
                    disabled={c.messagesPagination.page === 1}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                  </button>
                  <button
                    onClick={() => c.setMessagesPage(c.messagesPagination.page + 1)}
                    disabled={c.messagesPagination.page === c.messagesPagination.totalPages}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Conversations list view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="max-w-7xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />
        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => c.router.push('/admin')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Back to admin dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Chat Moderation</h1>
              <p className="text-gray-400 text-sm">Review DM conversations between users</p>
            </div>
          </div>

          {/* Stats */}
          {c.stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20"><MessageCircle className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-white">{c.stats.totalConversations.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Total Conversations</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20"><MessageCircle className="w-5 h-5 text-purple-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-white">{c.stats.totalMessages.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Total Messages</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/20"><MessageCircle className="w-5 h-5 text-green-400" /></div>
                  <div>
                    <p className="text-2xl font-bold text-white">{c.stats.activeToday.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Active Today</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <label htmlFor="chat-search" className="sr-only">Search conversations</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
              <input
                id="chat-search"
                type="text"
                value={c.search}
                onChange={(e) => c.setSearch(e.target.value)}
                placeholder="Search by participant name or username..."
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
              <p className="text-white font-medium mb-2">Failed to load conversations</p>
              <p className="text-gray-400 text-sm mb-4 text-center max-w-md">{c.fetchError}</p>
              <button onClick={() => c.fetchConversations()} className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : c.conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{c.search ? 'No conversations match your search' : 'No conversations yet'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {c.conversations.map((conv) => (
                <GlassCard key={conv.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Participants */}
                    <div className="flex -space-x-2 flex-shrink-0">
                      {[conv.user1, conv.user2].map((p) => (
                        p.avatarUrl ? (
                          <img key={p.id} src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-gray-800" />
                        ) : (
                          <div key={p.id} className="w-10 h-10 rounded-full bg-white/10 border-2 border-gray-800 flex items-center justify-center text-sm font-bold text-gray-400">
                            {(p.displayName || p.username || '?')[0].toUpperCase()}
                          </div>
                        )
                      ))}
                    </div>

                    {/* Names and preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{conv.user1.displayName || conv.user1.username}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${conv.user1.role === 'creator' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                          {conv.user1.role}
                        </span>
                        <span className="text-gray-600">&amp;</span>
                        <span className="text-sm font-medium text-white truncate">{conv.user2.displayName || conv.user2.username}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${conv.user2.role === 'creator' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                          {conv.user2.role}
                        </span>
                      </div>
                      {conv.lastMessageText && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessageText}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300">{conv.messageCount}</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">msgs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{c.formatDate(conv.lastMessageAt)}</p>
                      </div>
                      <button
                        onClick={() => c.selectConversation(conv.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
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
                  onClick={() => c.setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={c.pagination.page === 1}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <span className="text-sm text-gray-400" aria-live="polite">
                  Page {c.pagination.page} of {c.pagination.totalPages}
                </span>
                <button
                  onClick={() => c.setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={c.pagination.page === c.pagination.totalPages}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminChatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <AdminChatsContent />
    </Suspense>
  );
}
