'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Users, Search, CheckCircle, XCircle, Clock, Eye,
  Instagram, ChevronLeft, ChevronRight, ExternalLink,
  Loader2
} from 'lucide-react';
import { GlassModal } from '@/components/ui/GlassModal';

interface Application {
  id: string;
  user_id: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  other_social_links: string | null;
  follower_count: string | null;
  content_category: string | null;
  bio: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  user_created_at: string;
  reviewer_username: string | null;
}

type TabStatus = 'pending' | 'approved' | 'rejected' | 'all';

export default function CreatorApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, all: 0 });

  // Modal state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        page: page.toString(),
        limit: '20',
        search,
      });
      const res = await fetch(`/api/admin/creator-applications?${params}`);
      const data = await res.json();

      if (res.ok) {
        setApplications(data.applications || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setCounts(data.counts || { pending: 0, approved: 0, rejected: 0, all: 0 });
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [activeTab, page, search]);

  const handleApprove = async () => {
    if (!selectedApp) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/creator-applications/${selectedApp.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });

      if (res.ok) {
        setShowApproveModal(false);
        setSelectedApp(null);
        setAdminNotes('');
        fetchApplications();
      }
    } catch (error) {
      console.error('Error approving application:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/creator-applications/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason, adminNotes }),
      });

      if (res.ok) {
        setShowRejectModal(false);
        setSelectedApp(null);
        setRejectionReason('');
        setAdminNotes('');
        fetchApplications();
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tabs: { id: TabStatus; label: string; icon: React.ReactNode }[] = [
    { id: 'pending', label: 'Pending', icon: <Clock className="w-4 h-4" /> },
    { id: 'approved', label: 'Approved', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'rejected', label: 'Rejected', icon: <XCircle className="w-4 h-4" /> },
    { id: 'all', label: 'All', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Creator Applications</h1>
            <p className="text-gray-400">Review and manage creator applications</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-cyan-500/30' : 'bg-white/10'
              }`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by username, email, or social handle..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No {activeTab === 'all' ? '' : activeTab} applications found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                    {app.avatar_url ? (
                      <Image
                        src={app.avatar_url}
                        alt={app.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      app.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {app.display_name && (
                        <span className="font-semibold text-white">{app.display_name}</span>
                      )}
                      <span className="text-gray-400 text-sm">@{app.username}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400 text-sm truncate">{app.email}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {app.instagram_handle && (
                        <a
                          href={`https://instagram.com/${app.instagram_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-pink-400 hover:text-pink-300"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                          {app.instagram_handle}
                        </a>
                      )}
                      {app.follower_count && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                          {Number(app.follower_count).toLocaleString()} followers
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>Applied {formatDate(app.created_at)}</span>
                      {app.reviewed_at && app.reviewer_username && (
                        <>
                          <span>•</span>
                          <span>Reviewed by @{app.reviewer_username}</span>
                        </>
                      )}
                    </div>

                    {app.status === 'rejected' && app.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">
                          <strong>Rejection reason:</strong> {app.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelectedApp(app); setShowDetailsModal(true); }}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setSelectedApp(app); setShowApproveModal(true); }}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg text-green-400 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedApp(app); setShowRejectModal(true); }}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-gray-400 px-4">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <GlassModal
        isOpen={showApproveModal}
        onClose={() => { setShowApproveModal(false); setSelectedApp(null); setAdminNotes(''); }}
        title="Approve Application"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Approve <span className="text-white font-semibold">@{selectedApp?.username}</span>'s creator application?
          </p>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">
              This will upgrade the user to a creator account and grant them access to all creator features.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Admin Notes (optional, internal only)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowApproveModal(false); setSelectedApp(null); setAdminNotes(''); }}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Reject Modal */}
      <GlassModal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setSelectedApp(null); setRejectionReason(''); setAdminNotes(''); }}
        title="Reject Application"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Reject <span className="text-white font-semibold">@{selectedApp?.username}</span>'s creator application?
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this application is being rejected (will be shown to the user)..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Admin Notes (optional, internal only)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any internal notes..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowRejectModal(false); setSelectedApp(null); setRejectionReason(''); setAdminNotes(''); }}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Details Modal */}
      <GlassModal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedApp(null); }}
        title="Application Details"
        size="md"
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                {selectedApp.avatar_url ? (
                  <Image
                    src={selectedApp.avatar_url}
                    alt={selectedApp.username}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedApp.username?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">@{selectedApp.username}</h3>
                <p className="text-gray-400">{selectedApp.email}</p>
                <p className="text-gray-500 text-sm">
                  Member since {formatDate(selectedApp.user_created_at)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Full Name</label>
                <p className="text-white">{selectedApp.display_name || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Instagram Followers</label>
                <p className="text-white">{selectedApp.follower_count ? Number(selectedApp.follower_count).toLocaleString() : '-'}</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase">Instagram</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedApp.instagram_handle ? (
                  <a
                    href={`https://instagram.com/${selectedApp.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-pink-500/10 text-pink-400 rounded-lg text-sm hover:bg-pink-500/20 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    {selectedApp.instagram_handle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-500">-</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase">Status</label>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                selectedApp.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                selectedApp.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {selectedApp.status.charAt(0).toUpperCase() + selectedApp.status.slice(1)}
              </span>
            </div>

            {selectedApp.rejection_reason && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <label className="text-xs text-red-400 uppercase">Rejection Reason</label>
                <p className="text-white mt-1">{selectedApp.rejection_reason}</p>
              </div>
            )}

            {selectedApp.admin_notes && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <label className="text-xs text-gray-500 uppercase">Admin Notes</label>
                <p className="text-white mt-1">{selectedApp.admin_notes}</p>
              </div>
            )}

            <div className="text-xs text-gray-500">
              Applied: {formatDate(selectedApp.created_at)}
              {selectedApp.reviewed_at && (
                <> • Reviewed: {formatDate(selectedApp.reviewed_at)} by @{selectedApp.reviewer_username}</>
              )}
            </div>

            {/* Action buttons for pending applications */}
            {selectedApp.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowApproveModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </GlassModal>
    </div>
  );
}
