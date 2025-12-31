'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Instagram,
  Coins,
  ArrowLeft,
  Eye,
} from 'lucide-react';

interface Submission {
  id: string;
  platform: string;
  screenshotUrl: string;
  socialHandle: string;
  status: 'pending' | 'approved' | 'rejected';
  coinsAwarded: number;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    email: string;
  };
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  totalCoinsAwarded: number;
}

const PLATFORM_NAMES: Record<string, string> = {
  instagram_story: 'Instagram Story',
  instagram_bio: 'Instagram Bio',
  tiktok_bio: 'TikTok Bio',
};

export default function AdminShareRewardsPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/share-rewards?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setStats(data.stats || null);
      } else if (response.status === 403) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/share-rewards/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Approved!', 'success');
        setSelectedSubmission(null);
        fetchData();
      } else {
        showToast(data.error || 'Failed to approve', 'error');
      }
    } catch (error) {
      showToast('Failed to approve', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      showToast('Please enter a rejection reason', 'error');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/share-rewards/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Rejected', 'success');
        setSelectedSubmission(null);
        setRejectionReason('');
        fetchData();
      } else {
        showToast(data.error || 'Failed to reject', 'error');
      }
    } catch (error) {
      showToast('Failed to reject', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Share Rewards</h1>
            <p className="text-sm text-gray-400">Review social share submissions</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              <p className="text-sm text-gray-400">Pending</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
              <p className="text-sm text-gray-400">Approved</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
              <p className="text-sm text-gray-400">Rejected</p>
            </div>
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="flex items-center gap-1">
                <Coins className="w-5 h-5 text-yellow-400" />
                <p className="text-2xl font-bold text-cyan-400">{stats.totalCoinsAwarded}</p>
              </div>
              <p className="text-sm text-gray-400">Coins Awarded</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No submissions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Creator Info */}
                  <div className="flex-shrink-0">
                    {submission.creator?.avatarUrl ? (
                      <img
                        src={submission.creator.avatarUrl}
                        alt={submission.creator.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {submission.creator?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        @{submission.creator?.username || 'unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(submission.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                        {PLATFORM_NAMES[submission.platform] || submission.platform}
                      </span>
                      {submission.socialHandle && (
                        <span className="text-sm text-gray-400">
                          {submission.socialHandle}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {submission.status === 'pending' && (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                      {submission.status === 'approved' && (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-3 h-3" /> Approved (+{submission.coinsAwarded} coins)
                        </span>
                      )}
                      {submission.status === 'rejected' && (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>

                    {submission.rejectionReason && (
                      <p className="mt-2 text-sm text-red-400 bg-red-500/10 p-2 rounded">
                        {submission.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSubmission(submission)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-5 h-5 text-gray-400" />
                    </button>
                    {submission.socialHandle && (
                      <a
                        href={
                          submission.platform.includes('instagram')
                            ? `https://instagram.com/${submission.socialHandle.replace('@', '')}`
                            : `https://tiktok.com/@${submission.socialHandle.replace('@', '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5 text-gray-400" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Review Submission</h2>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setRejectionReason('');
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
                  >
                    <XCircle className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Creator */}
                <div className="flex items-center gap-3 mb-4">
                  {selectedSubmission.creator?.avatarUrl ? (
                    <img
                      src={selectedSubmission.creator.avatarUrl}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                  )}
                  <div>
                    <p className="font-semibold text-white">
                      @{selectedSubmission.creator?.username}
                    </p>
                    <p className="text-sm text-gray-400">
                      {PLATFORM_NAMES[selectedSubmission.platform]}
                      {selectedSubmission.socialHandle && ` • ${selectedSubmission.socialHandle}`}
                    </p>
                  </div>
                </div>

                {/* Screenshot */}
                <div className="mb-6">
                  <p className="text-sm text-gray-400 mb-2">Screenshot:</p>
                  <img
                    src={selectedSubmission.screenshotUrl}
                    alt="Proof"
                    className="w-full rounded-xl bg-black/30"
                  />
                </div>

                {/* Check Social */}
                {selectedSubmission.socialHandle && (
                  <a
                    href={
                      selectedSubmission.platform.includes('instagram')
                        ? `https://instagram.com/${selectedSubmission.socialHandle.replace('@', '')}`
                        : `https://tiktok.com/@${selectedSubmission.socialHandle.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors mb-6"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View {selectedSubmission.platform.includes('instagram') ? 'Instagram' : 'TikTok'} Profile
                  </a>
                )}

                {/* Actions */}
                {selectedSubmission.status === 'pending' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => handleApprove(selectedSubmission.id)}
                      disabled={processing}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Approve (+100 coins)'}
                    </button>

                    <div className="space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Rejection reason (required to reject)"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => handleReject(selectedSubmission.id)}
                        disabled={processing || !rejectionReason.trim()}
                        className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
