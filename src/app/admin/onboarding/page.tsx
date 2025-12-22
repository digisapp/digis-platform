'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  Upload,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Send,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Link2,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
  Filter,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface ParsedCreator {
  row: number;
  instagramHandle: string;
  email?: string;
  displayName?: string;
  status: 'valid' | 'duplicate_username' | 'duplicate_invite' | 'invalid';
  message?: string;
}

interface Invite {
  id: string;
  code: string;
  instagramHandle: string;
  email: string | null;
  displayName: string | null;
  status: 'pending' | 'claimed' | 'expired' | 'revoked';
  claimedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  batchId: string | null;
  claimedByUser?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

interface Stats {
  pending: number;
  claimed: number;
  expired: number;
  revoked: number;
  total: number;
}

type Tab = 'upload' | 'invites';

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  // Upload state
  const [csvContent, setCsvContent] = useState('');
  const [parsedCreators, setParsedCreators] = useState<ParsedCreator[]>([]);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseSummary, setParseSummary] = useState<{
    total: number;
    valid: number;
    duplicateUsername: number;
    duplicateInvite: number;
    invalid: number;
  } | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');

  // Invites state
  const [invites, setInvites] = useState<Invite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({ pending: 0, claimed: 0, expired: 0, revoked: 0, total: 0 });
  const [batches, setBatches] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterBatch, setFilterBatch] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          setIsAdmin(true);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  // Fetch invites
  const fetchInvites = useCallback(async () => {
    setInvitesLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterBatch) params.set('batchId', filterBatch);

      const res = await fetch(`/api/admin/onboarding?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites);
        setStats(data.stats);
        setBatches(data.batches);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setInvitesLoading(false);
    }
  }, [filterStatus, filterBatch]);

  useEffect(() => {
    if (isAdmin && activeTab === 'invites') {
      fetchInvites();
    }
  }, [isAdmin, activeTab, fetchInvites]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setParsedCreators([]);
      setParseSummary(null);
    };
    reader.readAsText(file);
  };

  // Parse CSV
  const handleParse = async () => {
    if (!csvContent) return;

    setParseLoading(true);
    try {
      const res = await fetch('/api/admin/onboarding/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      if (res.ok) {
        setParsedCreators(data.creators);
        setParseSummary(data.summary);
      } else {
        setToast({ message: data.error || 'Failed to parse CSV', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Failed to parse CSV', type: 'error' });
    } finally {
      setParseLoading(false);
    }
  };

  // Generate invites
  const handleGenerate = async () => {
    const validCreators = parsedCreators.filter((c) => c.status === 'valid');
    if (validCreators.length === 0) {
      setToast({ message: 'No valid creators to generate invites for', type: 'error' });
      return;
    }

    setGenerateLoading(true);
    try {
      const res = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creators: validCreators,
          batchName: batchName || undefined,
          expiresInDays: expiresInDays || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({
          message: `Created ${data.created} invites${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}`,
          type: 'success',
        });
        // Reset form
        setCsvContent('');
        setParsedCreators([]);
        setParseSummary(null);
        setBatchName('');
        setExpiresInDays('');
        // Switch to invites tab
        setActiveTab('invites');
        setFilterBatch(data.batchId);
        fetchInvites();
      } else {
        setToast({ message: data.error || 'Failed to generate invites', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Failed to generate invites', type: 'error' });
    } finally {
      setGenerateLoading(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterBatch) params.set('batchId', filterBatch);

    window.open(`/api/admin/onboarding/export?${params.toString()}`, '_blank');
  };

  // Copy invite link
  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/claim/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Revoke invite
  const revokeInvite = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      const res = await fetch(`/api/admin/onboarding/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Invite revoked', type: 'success' });
        fetchInvites();
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Failed to revoke invite', type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Failed to revoke invite', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-lg font-bold text-white">Creator Onboarding</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 pt-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <GlassCard className="p-4 text-center">
            <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
            <div className="text-sm text-gray-400">Pending</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.claimed}</div>
            <div className="text-sm text-gray-400">Claimed</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.expired}</div>
            <div className="text-sm text-gray-400">Expired</div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total</div>
          </GlassCard>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'invites'
                ? 'bg-cyan-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Manage Invites
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              Bulk Creator Import
            </h2>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload CSV File
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex items-center justify-center px-4 py-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300">Click to upload CSV</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Columns: instagram_handle, email (optional), display_name (optional)
                    </p>
                  </div>
                </label>
              </div>
              {csvContent && (
                <p className="mt-2 text-sm text-green-400">
                  File loaded ({csvContent.split('\n').length - 1} rows)
                </p>
              )}
            </div>

            {/* Parse Button */}
            {csvContent && !parseSummary && (
              <button
                onClick={handleParse}
                disabled={parseLoading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {parseLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Parsing...
                  </span>
                ) : (
                  'Parse & Validate'
                )}
              </button>
            )}

            {/* Parse Results */}
            {parseSummary && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Validation Results</h3>

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-white">{parseSummary.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-400">{parseSummary.valid}</div>
                    <div className="text-xs text-gray-400">Valid</div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-yellow-400">{parseSummary.duplicateUsername}</div>
                    <div className="text-xs text-gray-400">Username Exists</div>
                  </div>
                  <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-orange-400">{parseSummary.duplicateInvite}</div>
                    <div className="text-xs text-gray-400">Already Invited</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-red-400">{parseSummary.invalid}</div>
                    <div className="text-xs text-gray-400">Invalid</div>
                  </div>
                </div>

                {/* Creator List */}
                <div className="max-h-64 overflow-y-auto mb-4 border border-white/10 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400">Row</th>
                        <th className="px-3 py-2 text-left text-gray-400">Instagram</th>
                        <th className="px-3 py-2 text-left text-gray-400">Email</th>
                        <th className="px-3 py-2 text-left text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedCreators.map((creator, idx) => (
                        <tr key={idx} className="border-t border-white/5">
                          <td className="px-3 py-2 text-gray-400">{creator.row}</td>
                          <td className="px-3 py-2 text-white">@{creator.instagramHandle}</td>
                          <td className="px-3 py-2 text-gray-400">{creator.email || '-'}</td>
                          <td className="px-3 py-2">
                            {creator.status === 'valid' ? (
                              <span className="text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Valid
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" /> {creator.message}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Batch Name (optional)
                    </label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g., instagram_dec_2024"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Expires in (days, optional)
                    </label>
                    <input
                      type="number"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Leave blank for no expiration"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generateLoading || parseSummary.valid === 0}
                  className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generateLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Generate {parseSummary.valid} Invite Links
                    </>
                  )}
                </button>
              </div>
            )}
          </GlassCard>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <GlassCard className="p-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-cyan-400" />
                Invite Links
              </h2>

              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="claimed">Claimed</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>

                {/* Batch Filter */}
                {batches.length > 0 && (
                  <select
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">All Batches</option>
                    {batches.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                )}

                {/* Refresh */}
                <button
                  onClick={fetchInvites}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${invitesLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* Export */}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Invites List */}
            {invitesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No invites found. Upload a CSV to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Instagram</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Invite Link</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Created</th>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">@{invite.instagramHandle}</span>
                            {invite.displayName && invite.displayName !== invite.instagramHandle && (
                              <span className="text-gray-500 text-xs">({invite.displayName})</span>
                            )}
                          </div>
                          {invite.email && (
                            <div className="text-xs text-gray-500">{invite.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {invite.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {invite.status === 'claimed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" /> Claimed
                            </span>
                          )}
                          {invite.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" /> Expired
                            </span>
                          )}
                          {invite.status === 'revoked' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-medium">
                              <XCircle className="w-3 h-3" /> Revoked
                            </span>
                          )}
                          {invite.claimedByUser && (
                            <div className="mt-1 text-xs text-gray-400">
                              → @{invite.claimedByUser.username}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                              /claim/{invite.code}
                            </code>
                            <button
                              onClick={() => copyInviteLink(invite.code)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="Copy link"
                            >
                              {copiedCode === invite.code ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(invite.createdAt).toLocaleDateString()}
                          {invite.expiresAt && (
                            <div className="text-yellow-500">
                              Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {invite.status === 'pending' && (
                            <button
                              onClick={() => revokeInvite(invite.id)}
                              className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                              title="Revoke invite"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
