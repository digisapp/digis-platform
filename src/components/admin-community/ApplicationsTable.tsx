'use client';

import { CheckCircle, XCircle, AlertTriangle, Clock, Instagram, Users, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle } from 'lucide-react';
import type { Application, ApplicationCounts, Pagination } from './types';

interface ApplicationsTableProps {
  applications: Application[];
  loading: boolean;
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  onStatusFilterChange: (status: 'all' | 'pending' | 'approved' | 'rejected') => void;
  counts: ApplicationCounts;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  formatDate: (d: string | null) => string;
}

const STATUS_FILTERS: { key: 'pending' | 'approved' | 'rejected' | 'all'; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: 'yellow' },
  { key: 'approved', label: 'Approved', color: 'green' },
  { key: 'rejected', label: 'Rejected', color: 'red' },
  { key: 'all', label: 'All', color: 'gray' },
];

function StatusBadge({ status }: { status: Application['status'] }) {
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25">
      <CheckCircle className="w-3 h-3" /> Approved
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">
      <XCircle className="w-3 h-3" /> Rejected
    </span>
  );
}

function RedFlagBadge({ flag }: { flag: Application['red_flags'][number] }) {
  const color = flag.severity === 'danger' ? 'text-red-400' : 'text-yellow-400';
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`} title={flag.message}>
      <AlertTriangle className="w-3 h-3" />
      <span className="hidden sm:inline">{flag.message}</span>
    </span>
  );
}

export function ApplicationsTable({
  applications, loading, statusFilter, onStatusFilterChange,
  counts, pagination, onPageChange, onApprove, onReject, formatDate,
}: ApplicationsTableProps) {
  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => {
          const count = counts[f.key];
          const isActive = statusFilter === f.key;
          const activeClass = f.key === 'pending'
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
            : f.key === 'approved'
            ? 'bg-green-500/20 text-green-300 border border-green-500/40'
            : f.key === 'rejected'
            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
            : 'bg-white/10 text-white border border-white/20';
          return (
            <button
              key={f.key}
              onClick={() => onStatusFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive ? activeClass : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoaderCircle className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white/5 rounded-2xl border border-white/10">
          <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-white font-medium">No {statusFilter === 'all' ? '' : statusFilter} applications</p>
          <p className="text-gray-500 text-sm mt-1">Applications will appear here once submitted</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                {app.avatarUrl ? (
                  <img src={app.avatarUrl} alt={app.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    {(app.displayName || app.username || '?')[0].toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">@{app.username}</span>
                    <StatusBadge status={app.status} />
                    {app.account_age_days < 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/25">
                        <AlertTriangle className="w-3 h-3" /> New account
                      </span>
                    )}
                  </div>

                  <p className="text-gray-500 text-xs mb-2 truncate">{app.email}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    {app.instagramHandle && (
                      <a
                        href={`https://instagram.com/${app.instagramHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-pink-400 transition-colors"
                      >
                        <Instagram className="w-3 h-3" />
                        {app.instagramHandle}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {app.followerCount != null && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {app.followerCount.toLocaleString()} followers
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Applied {formatDate(app.createdAt)}
                    </span>
                  </div>

                  {/* Red Flags */}
                  {app.red_flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {app.red_flags.map((flag, i) => (
                        <RedFlagBadge key={i} flag={flag} />
                      ))}
                    </div>
                  )}

                  {/* Rejection reason */}
                  {app.status === 'rejected' && app.rejectionReason && (
                    <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                      Reason: {app.rejectionReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                {app.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0 ml-auto">
                    <button
                      onClick={() => onApprove(app.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium border border-green-500/30 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(app.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium border border-red-500/30 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-gray-400">
            {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
