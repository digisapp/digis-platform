'use client';

import { useEffect, useState } from 'react';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { DollarSign, Clock, CheckCircle, XCircle, Eye, User, AlertCircle } from 'lucide-react';
import { formatCoinsAsUSD } from '@/lib/stripe/config';

interface PayoutRequest {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  bankingInfo: {
    accountHolderName: string;
    bankName: string;
    accountType: string;
    lastFourDigits: string;
    isVerified: boolean;
  };
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  adminNotes: string | null;
}

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayouts();
  }, [filter]);

  const fetchPayouts = async () => {
    try {
      const response = await fetch(`/api/admin/payouts?filter=${filter}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load payouts');
      }

      setPayouts(data.payouts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (payoutId: string, newStatus: string, failureReason?: string) => {
    setProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/admin/payouts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId,
          status: newStatus,
          adminNotes,
          failureReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payout');
      }

      // Refresh list
      fetchPayouts();
      setSelectedPayout(null);
      setAdminNotes('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <MobileHeader title="Payout Management" showBack />

      <div className="max-w-7xl mx-auto px-4 pt-20 space-y-6">
        {/* Header Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {payouts.filter(p => p.status === 'pending').length}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Processing</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {payouts.filter(p => p.status === 'processing').length}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Completed</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {payouts.filter(p => p.status === 'completed').length}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-400">Failed</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {payouts.filter(p => p.status === 'failed').length}
            </p>
          </GlassCard>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-digis-cyan text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-digis-cyan text-white'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            All Payouts
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}

        {/* Payouts List */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Payout Requests</h2>

          <div className="space-y-4">
            {payouts.length > 0 ? (
              payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="w-10 h-10 text-gray-400" />
                      <div>
                        <p className="text-white font-bold">{payout.creatorDisplayName}</p>
                        <p className="text-sm text-gray-400">@{payout.creatorUsername}</p>
                      </div>
                    </div>
                    {getStatusBadge(payout.status)}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Amount</p>
                      <p className="text-lg font-bold text-white">
                        {formatCoinsAsUSD(payout.amount)}
                      </p>
                      <p className="text-xs text-gray-400">{payout.amount.toLocaleString()} coins</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-1">Requested</p>
                      <p className="text-sm text-white">
                        {new Date(payout.requestedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(payout.requestedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <GlassButton
                      variant="cyan"
                      size="sm"
                      onClick={() => setSelectedPayout(payout)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </GlassButton>

                    {payout.status === 'pending' && (
                      <>
                        <GlassButton
                          variant="gradient"
                          size="sm"
                          onClick={() => handleUpdateStatus(payout.id, 'processing')}
                          disabled={processing}
                        >
                          Mark Processing
                        </GlassButton>
                        <GlassButton
                          variant="pink"
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Reason for cancellation:');
                            if (reason) handleUpdateStatus(payout.id, 'cancelled', reason);
                          }}
                          disabled={processing}
                        >
                          Cancel
                        </GlassButton>
                      </>
                    )}

                    {payout.status === 'processing' && (
                      <>
                        <GlassButton
                          variant="gradient"
                          size="sm"
                          onClick={() => handleUpdateStatus(payout.id, 'completed')}
                          disabled={processing}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Completed
                        </GlassButton>
                        <GlassButton
                          variant="pink"
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Reason for failure:');
                            if (reason) handleUpdateStatus(payout.id, 'failed', reason);
                          }}
                          disabled={processing}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Mark Failed
                        </GlassButton>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No payout requests found</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Detail Modal */}
        {selectedPayout && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <GlassCard className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Payout Details</h2>
                <button
                  onClick={() => setSelectedPayout(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Creator Info */}
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="text-sm font-bold text-digis-cyan mb-2">Creator</h3>
                  <p className="text-white font-bold">{selectedPayout.creatorDisplayName}</p>
                  <p className="text-sm text-gray-400">@{selectedPayout.creatorUsername}</p>
                </div>

                {/* Banking Info */}
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="text-sm font-bold text-digis-cyan mb-2">Banking Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Holder:</span>
                      <span className="text-white font-medium">
                        {selectedPayout.bankingInfo.accountHolderName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bank:</span>
                      <span className="text-white font-medium">
                        {selectedPayout.bankingInfo.bankName || 'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Type:</span>
                      <span className="text-white font-medium capitalize">
                        {selectedPayout.bankingInfo.accountType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Number:</span>
                      <span className="text-white font-medium">
                        ****{selectedPayout.bankingInfo.lastFourDigits}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Verified:</span>
                      <span className={selectedPayout.bankingInfo.isVerified ? 'text-green-400' : 'text-yellow-400'}>
                        {selectedPayout.bankingInfo.isVerified ? '✓ Yes' : '⚠ No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan focus:border-digis-cyan transition-all"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this payout..."
                  />
                </div>

                {selectedPayout.failureReason && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-sm font-bold text-red-400 mb-1">Failure Reason</p>
                    <p className="text-white">{selectedPayout.failureReason}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
