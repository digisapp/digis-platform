'use client';

import { useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import {
  CreditCard, Clock, CheckCircle, XCircle, DollarSign,
  Globe, ArrowRight, AlertCircle,
} from 'lucide-react';
import { formatCoinsAsUSD } from '@/lib/stripe/constants';
import type { PayoutsData } from './types';

interface AdminPayoutsTabProps {
  loading: boolean;
  payoutsData: PayoutsData | null;
  onRetry: () => void;
}

export function AdminPayoutsTab({ loading, payoutsData, onRetry }: AdminPayoutsTabProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!payoutsData) {
    return (
      <GlassCard className="p-12 text-center">
        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">No payout data available</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  const { stats, payouts } = payoutsData;
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const processingPayouts = payouts.filter(p => p.status === 'processing');

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/20 rounded-lg"><Clock className="w-5 h-5 text-yellow-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-lg"><DollarSign className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Processing</p>
              <p className="text-xl font-bold text-blue-400">{stats.processing}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Completed</p>
              <p className="text-xl font-bold text-green-400">{stats.completed}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-lg"><XCircle className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-xs text-gray-400">Failed</p>
              <p className="text-xl font-bold text-red-400">{stats.failed}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Action Required Banner */}
      {stats.pending > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-yellow-400 font-semibold">
                {stats.pending} payout{stats.pending !== 1 ? 's' : ''} need{stats.pending === 1 ? 's' : ''} your attention
              </p>
              <p className="text-gray-400 text-sm">
                Review and process pending creator payout requests
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin/payouts')}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors shrink-0"
          >
            Process <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recent Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Pending Payouts
            </h3>
            <button
              onClick={() => router.push('/admin/payouts')}
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {pendingPayouts.slice(0, 5).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => router.push('/admin/payouts')}
              >
                <div className="flex items-center gap-3">
                  {payout.payoutMethod === 'payoneer' ? (
                    <Globe className="w-4 h-4 text-purple-400" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-blue-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {payout.creatorDisplayName || `@${payout.creatorUsername}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{payout.creatorUsername} • {payout.payoutMethod === 'payoneer' ? 'Payoneer' : 'Bank Transfer'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-400">{formatCoinsAsUSD(payout.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(payout.requestedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {pendingPayouts.length > 5 && (
              <p className="text-center text-sm text-gray-500 pt-1">
                +{pendingPayouts.length - 5} more pending
              </p>
            )}
          </div>
        </GlassCard>
      )}

      {/* Processing */}
      {processingPayouts.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Currently Processing
          </h3>
          <div className="space-y-3">
            {processingPayouts.slice(0, 3).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl cursor-pointer hover:bg-blue-500/15 transition-colors"
                onClick={() => router.push('/admin/payouts')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {payout.creatorDisplayName || `@${payout.creatorUsername}`}
                    </p>
                    <p className="text-xs text-gray-400">@{payout.creatorUsername}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-blue-400">{formatCoinsAsUSD(payout.amount)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {stats.pending === 0 && stats.processing === 0 && (
        <GlassCard className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
          <p className="text-gray-400 mb-6">No pending or processing payout requests right now.</p>
          <button
            onClick={() => router.push('/admin/payouts')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl font-semibold transition-all hover:scale-105"
          >
            View Payout History
          </button>
        </GlassCard>
      )}
    </div>
  );
}
