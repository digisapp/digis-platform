'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { DollarSign, TrendingUp, Clock, Download, Wallet, AlertCircle, Globe, CreditCard, ExternalLink, CheckCircle } from 'lucide-react';
import { formatCoinsAsUSD, coinsToUSD, MIN_PAYOUT_COINS, MIN_PAYOUT_USD } from '@/lib/stripe/constants';

interface EarningsData {
  balance: number; // coins
  heldBalance: number; // coins held in active calls/streams
  availableBalance: number; // coins available for payout
  totalEarnings: number; // lifetime coins earned
  pendingPayout: {
    amount: number;
    status: string;
    requestedAt: string;
    method?: string;
  } | null;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
  earningsByType: {
    call_earnings: number;
    message_earnings: number;
    stream_tip: number;
    subscription_earnings: number;
  };
}

interface PayoneerStatus {
  configured: boolean;
  status: 'not_registered' | 'pending' | 'active' | 'inactive' | 'declined';
  isActive: boolean;
  canRequestPayout: boolean;
}

export default function CreatorEarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [error, setError] = useState('');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'payoneer'>('bank_transfer');
  const [payoneerStatus, setPayoneerStatus] = useState<PayoneerStatus | null>(null);
  const [connectingPayoneer, setConnectingPayoneer] = useState(false);

  useEffect(() => {
    fetchEarnings();
    fetchPayoneerStatus();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await fetch('/api/creator/earnings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load earnings');
      }

      setEarningsData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoneerStatus = async () => {
    try {
      const response = await fetch('/api/creator/payoneer/status');
      const data = await response.json();

      if (response.ok) {
        setPayoneerStatus(data);
        // If Payoneer is active but bank_transfer selected, keep it
        // User can switch if they want
      }
    } catch (err) {
      // Silently fail - Payoneer might not be configured
      console.error('Failed to fetch Payoneer status:', err);
    }
  };

  const handleConnectPayoneer = async () => {
    setConnectingPayoneer(true);

    try {
      const response = await fetch('/api/creator/payoneer/register', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Payoneer link');
      }

      // Open Payoneer registration in new tab
      if (data.registrationLink) {
        window.open(data.registrationLink, '_blank');
        setPayoutMessage('Payoneer registration opened in a new tab. Complete the setup there.');
      }

      // Refresh status after a short delay
      setTimeout(() => {
        fetchPayoneerStatus();
      }, 2000);
    } catch (err: any) {
      setPayoutMessage(err.message);
    } finally {
      setConnectingPayoneer(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!earningsData) return;

    if (earningsData.availableBalance < MIN_PAYOUT_COINS) {
      setPayoutMessage(`Minimum payout is ${MIN_PAYOUT_COINS.toLocaleString()} coins (${formatCoinsAsUSD(MIN_PAYOUT_COINS)})`);
      return;
    }

    // Validate payout method
    if (payoutMethod === 'payoneer' && !payoneerStatus?.isActive) {
      setPayoutMessage('Please connect your Payoneer account first');
      return;
    }

    setRequestingPayout(true);
    setPayoutMessage('');

    try {
      const response = await fetch('/api/wallet/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: earningsData.availableBalance,
          method: payoutMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request payout');
      }

      const methodLabel = payoutMethod === 'payoneer' ? 'Payoneer' : 'bank transfer';
      setPayoutMessage(`Payout requested via ${methodLabel}! You will receive an email when it is processed.`);
      fetchEarnings(); // Refresh data
    } catch (err: any) {
      setPayoutMessage(err.message);
    } finally {
      setRequestingPayout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
        <MobileHeader />
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />
        <div className="max-w-7xl mx-auto pt-4 md:pt-10">
          <GlassCard className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  const balanceUSD = earningsData ? coinsToUSD(earningsData.balance) : 0;
  const availableUSD = earningsData ? coinsToUSD(earningsData.availableBalance) : 0;
  const heldUSD = earningsData ? coinsToUSD(earningsData.heldBalance) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-24 md:pb-8">
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="max-w-7xl mx-auto px-4 pt-4 md:pt-10 space-y-6">
        {/* Balance Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Total Balance */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-digis-cyan to-blue-500">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Balance</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatCoinsAsUSD(earningsData?.balance || 0)}
            </p>
            <p className="text-sm text-gray-400">
              {earningsData?.balance.toLocaleString()} coins
            </p>
          </GlassCard>

          {/* Available for Payout */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Available</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatCoinsAsUSD(earningsData?.availableBalance || 0)}
            </p>
            <p className="text-sm text-gray-400">
              {earningsData?.availableBalance.toLocaleString()} coins
            </p>
          </GlassCard>

          {/* Held Balance */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">In Active Calls</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {formatCoinsAsUSD(earningsData?.heldBalance || 0)}
            </p>
            <p className="text-sm text-gray-400">
              {earningsData?.heldBalance.toLocaleString()} coins held
            </p>
          </GlassCard>
        </div>

        {/* Payout Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-digis-cyan" />
              <h2 className="text-xl font-bold text-white">Request Payout</h2>
            </div>
          </div>

          {earningsData?.pendingPayout ? (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-400 font-medium mb-2">
                Payout Pending: {formatCoinsAsUSD(earningsData.pendingPayout.amount)}
              </p>
              <p className="text-sm text-gray-400">
                Requested on {new Date(earningsData.pendingPayout.requestedAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-400">
                Status: <span className="capitalize">{earningsData.pendingPayout.status}</span>
                {earningsData.pendingPayout.method && (
                  <span className="ml-2">
                    via {earningsData.pendingPayout.method === 'payoneer' ? 'Payoneer' : 'Bank Transfer'}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-digis-cyan/10 border border-digis-cyan/30">
                <p className="text-white font-medium mb-1">
                  Available to withdraw: {formatCoinsAsUSD(earningsData?.availableBalance || 0)}
                </p>
                <p className="text-sm text-gray-400">
                  Minimum payout: {formatCoinsAsUSD(MIN_PAYOUT_COINS)}
                </p>
              </div>

              {/* Payout Method Selector */}
              {payoneerStatus?.configured && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-300">Payout Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPayoutMethod('bank_transfer')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        payoutMethod === 'bank_transfer'
                          ? 'border-digis-cyan bg-digis-cyan/10'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mx-auto mb-2 ${
                        payoutMethod === 'bank_transfer' ? 'text-digis-cyan' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        payoutMethod === 'bank_transfer' ? 'text-white' : 'text-gray-400'
                      }`}>
                        Bank Transfer
                      </p>
                      <p className="text-xs text-gray-500 mt-1">US accounts only</p>
                    </button>

                    <button
                      onClick={() => payoneerStatus?.isActive && setPayoutMethod('payoneer')}
                      disabled={!payoneerStatus?.isActive}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        payoutMethod === 'payoneer'
                          ? 'border-purple-500 bg-purple-500/10'
                          : payoneerStatus?.isActive
                            ? 'border-white/10 bg-white/5 hover:border-white/30'
                            : 'border-white/5 bg-white/5 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <Globe className={`w-6 h-6 mx-auto mb-2 ${
                        payoutMethod === 'payoneer' ? 'text-purple-400' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm font-medium ${
                        payoutMethod === 'payoneer' ? 'text-white' : 'text-gray-400'
                      }`}>
                        Payoneer
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {payoneerStatus?.isActive ? 'International' : 'Not connected'}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Payoneer Connection Section */}
              {payoneerStatus?.configured && !payoneerStatus?.isActive && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-white font-medium mb-1">
                        {payoneerStatus?.status === 'pending'
                          ? 'Complete Payoneer Setup'
                          : 'Connect Payoneer for International Payouts'}
                      </p>
                      <p className="text-sm text-gray-400 mb-3">
                        {payoneerStatus?.status === 'pending'
                          ? 'Your Payoneer registration is pending. Complete the setup to receive payouts.'
                          : 'Receive payouts to bank accounts worldwide via Payoneer.'}
                      </p>
                      <GlassButton
                        variant="pink"
                        size="sm"
                        onClick={handleConnectPayoneer}
                        disabled={connectingPayoneer}
                      >
                        {connectingPayoneer ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {payoneerStatus?.status === 'pending' ? 'Continue Setup' : 'Connect Payoneer'}
                          </>
                        )}
                      </GlassButton>
                    </div>
                  </div>
                </div>
              )}

              {/* Payoneer Connected Badge */}
              {payoneerStatus?.isActive && payoutMethod === 'payoneer' && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Payoneer account connected</span>
                </div>
              )}

              {payoutMessage && (
                <div className={`p-4 rounded-xl ${
                  payoutMessage.includes('successfully') || payoutMessage.includes('opened')
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {payoutMessage}
                </div>
              )}

              <GlassButton
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={handleRequestPayout}
                disabled={
                  requestingPayout ||
                  (earningsData?.availableBalance || 0) < MIN_PAYOUT_COINS ||
                  (payoutMethod === 'payoneer' && !payoneerStatus?.isActive)
                }
              >
                {requestingPayout ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    {payoutMethod === 'payoneer' ? (
                      <Globe className="w-5 h-5 mr-2" />
                    ) : (
                      <CreditCard className="w-5 h-5 mr-2" />
                    )}
                    Request Payout: {formatCoinsAsUSD(earningsData?.availableBalance || 0)}
                  </>
                )}
              </GlassButton>

              <p className="text-xs text-gray-500 text-center">
                {payoutMethod === 'payoneer'
                  ? 'Payoneer payouts are typically processed within 1-2 business days'
                  : 'Bank transfer payouts are processed within 2-3 business days'}
              </p>
            </div>
          )}
        </GlassCard>

        {/* Earnings Breakdown */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Earnings Breakdown</h2>
          <div className="space-y-3">
            {earningsData?.earningsByType && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-gray-300">Video Calls</span>
                  <span className="font-bold text-white">
                    {formatCoinsAsUSD(earningsData.earningsByType.call_earnings || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-gray-300">Stream Tips</span>
                  <span className="font-bold text-white">
                    {formatCoinsAsUSD(earningsData.earningsByType.stream_tip || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-gray-300">Messages</span>
                  <span className="font-bold text-white">
                    {formatCoinsAsUSD(earningsData.earningsByType.message_earnings || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-gray-300">Subscriptions</span>
                  <span className="font-bold text-white">
                    {formatCoinsAsUSD(earningsData.earningsByType.subscription_earnings || 0)}
                  </span>
                </div>
              </>
            )}
          </div>
        </GlassCard>

        {/* Recent Transactions */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            <button className="text-sm text-digis-cyan hover:text-cyan-400">
              <Download className="w-4 h-4 inline mr-1" />
              Export
            </button>
          </div>

          <div className="space-y-2">
            {earningsData?.recentTransactions && earningsData.recentTransactions.length > 0 ? (
              earningsData.recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString()} at{' '}
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCoinsAsUSD(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.amount} coins
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-8">No transactions yet</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
