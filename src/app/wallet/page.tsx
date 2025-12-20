'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard, GlassButton, WalletWidget, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import { BankingInfoModal } from '@/components/wallet/BankingInfoModal';
import { DollarSign, History, Building2, Coins, Sparkles, TrendingUp, ArrowUpRight, ArrowDownLeft, Gift, Phone, Star, Lock, CheckCircle, Clock, XCircle, Ticket, MessageCircle, CreditCard } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
  status: string;
}

interface PayoutRequest {
  id: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

interface BankingInfo {
  id: string;
  accountHolderName: string;
  accountType: string;
  bankName: string | null;
  lastFourDigits: string;
  isVerified: boolean;
}

type TabType = 'balance' | 'payouts' | 'banking';

export default function WalletPage() {
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToastContext();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [bankingInfo, setBankingInfo] = useState<BankingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBuyCoins, setShowBuyCoins] = useState(false);
  const [showBankingModal, setShowBankingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [isCreator, setIsCreator] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [earningsPeriod, setEarningsPeriod] = useState<'24h' | '1w' | '1m' | 'total'>('24h');

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    // Recalculate earnings when period changes or transactions update
    if (isCreator && transactions.length > 0) {
      fetchEarnings();
    }
  }, [earningsPeriod, transactions, isCreator]);

  const checkAuthAndFetchData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Fetch profile and basic wallet data in PARALLEL
      const [profileResponse, balanceResponse, transactionsResponse] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/wallet/balance'),
        fetch('/api/wallet/transactions?limit=50'),
      ]);

      // Handle 401 errors - redirect to login
      if (profileResponse.status === 401 || balanceResponse.status === 401) {
        router.push('/');
        return;
      }

      // Process profile
      let userIsCreator = false;
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        userIsCreator = profile.user?.role === 'creator';
        setIsCreator(userIsCreator);
      }

      // Process balance
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.balance || 0);
      }

      // Process transactions
      let transactionsData: Transaction[] = [];
      if (transactionsResponse.ok) {
        const data = await transactionsResponse.json();
        transactionsData = data.transactions || [];
        setTransactions(transactionsData);
      }

      // Calculate earnings from already-fetched transactions (no extra API call!)
      if (userIsCreator && transactionsData.length > 0) {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h default
        const totalEarnings = transactionsData
          .filter((tx) => tx.amount > 0 && new Date(tx.createdAt) >= cutoffDate)
          .reduce((sum, tx) => sum + tx.amount, 0);
        setEarnings(totalEarnings);
      }

      // Fetch creator-specific data in parallel (if creator)
      if (userIsCreator) {
        const [payoutsResponse, bankingResponse] = await Promise.all([
          fetch('/api/wallet/payouts'),
          fetch('/api/wallet/banking-info'),
        ]);

        if (payoutsResponse.ok) {
          const payoutsData = await payoutsResponse.json();
          setPayouts(payoutsData.payouts || []);
        }

        if (bankingResponse.ok) {
          const bankingData = await bankingResponse.json();
          setBankingInfo(bankingData.bankingInfo);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletData = async (userIsCreator?: boolean) => {
    // Use passed value or fall back to state (for refresh calls)
    const creatorStatus = userIsCreator ?? isCreator;

    try {
      // Fetch all basic data in parallel
      const [balanceResponse, transactionsResponse] = await Promise.all([
        fetch('/api/wallet/balance'),
        fetch('/api/wallet/transactions?limit=50'),
      ]);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.balance || 0);
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }

      // Fetch creator-specific data in parallel
      if (creatorStatus) {
        const [payoutsResponse, bankingResponse] = await Promise.all([
          fetch('/api/wallet/payouts'),
          fetch('/api/wallet/banking-info'),
        ]);

        if (payoutsResponse.ok) {
          const payoutsData = await payoutsResponse.json();
          setPayouts(payoutsData.payouts || []);
        }

        if (bankingResponse.ok) {
          const bankingData = await bankingResponse.json();
          setBankingInfo(bankingData.bankingInfo);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async () => {
    // Use existing transactions from state - no extra API call needed!
    const now = new Date();
    let cutoffDate: Date | null = null;

    // Calculate cutoff date based on selected period
    switch (earningsPeriod) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'total':
        cutoffDate = null;
        break;
    }

    // Sum up positive transactions (earnings) from selected period
    const totalEarnings = transactions
      .filter((tx) => {
        if (tx.amount <= 0) return false;
        if (!cutoffDate) return true;
        const txDate = new Date(tx.createdAt);
        return txDate >= cutoffDate;
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    setEarnings(totalEarnings);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    if (isCreator) {
      await fetchEarnings();
    }
    setRefreshing(false);
  };

  const handlePurchaseSuccess = async () => {
    setShowBuyCoins(false);
    await handleRefresh();
  };

  const handleBankingInfoSuccess = async () => {
    setShowBankingModal(false);
    await handleRefresh();
  };

  const getTransactionIcon = (type: string, amount: number) => {
    const iconClass = "w-6 h-6";
    // Use amount to determine if it's income (positive) or expense (negative)
    const isIncome = amount > 0;

    switch (type) {
      case 'purchase': return <ArrowUpRight className={`${iconClass} text-green-500`} />;
      case 'gift': return <Gift className={`${iconClass} text-pink-500`} />;
      case 'call_charge':
      case 'call_earnings': return <Phone className={`${iconClass} ${isIncome ? 'text-green-500' : 'text-blue-500'}`} />;
      case 'stream_tip':
      case 'dm_tip': return <Star className={`${iconClass} text-yellow-500`} />;
      case 'stream_ticket': return <Ticket className={`${iconClass} ${isIncome ? 'text-green-500' : 'text-purple-500'}`} />;
      case 'ppv_unlock':
      case 'locked_message': return <Lock className={`${iconClass} ${isIncome ? 'text-green-500' : 'text-purple-500'}`} />;
      case 'message_charge':
      case 'message_earnings': return <MessageCircle className={`${iconClass} ${isIncome ? 'text-green-500' : 'text-blue-500'}`} />;
      case 'subscription_payment':
      case 'subscription_earnings': return <CreditCard className={`${iconClass} ${isIncome ? 'text-green-500' : 'text-cyan-500'}`} />;
      case 'creator_payout': return <DollarSign className={`${iconClass} text-green-500`} />;
      case 'payout_refund':
      case 'refund': return <ArrowDownLeft className={`${iconClass} text-gray-400`} />;
      default: return <Coins className={`${iconClass} ${isIncome ? 'text-green-500' : 'text-gray-400'}`} />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    const isIncome = amount > 0;

    switch (type) {
      case 'purchase': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      case 'gift': return 'from-pink-500/20 to-rose-500/20 border-pink-500/30';
      case 'call_charge':
      case 'call_earnings': return isIncome ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'stream_tip':
      case 'dm_tip': return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 'stream_ticket': return isIncome ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
      case 'ppv_unlock':
      case 'locked_message': return isIncome ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
      case 'message_charge':
      case 'message_earnings': return isIncome ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'subscription_payment':
      case 'subscription_earnings': return isIncome ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30';
      case 'creator_payout': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      case 'payout_refund':
      case 'refund': return 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
      default: return isIncome ? 'from-green-500/20 to-emerald-500/20 border-green-500/30' : 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-xs font-semibold text-green-300">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>;
      case 'processing':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full text-xs font-semibold text-yellow-300">
          <Clock className="w-3 h-3" />
          Processing
        </span>;
      case 'failed':
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-full text-xs font-semibold text-red-300">
          <XCircle className="w-3 h-3" />
          Failed
        </span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-500/20 rounded-full text-xs font-semibold text-white">
          <XCircle className="w-3 h-3" />
          Cancelled
        </span>;
      default:
        return <span className="px-2 py-1 bg-blue-500/20 rounded-full text-xs font-semibold text-blue-700">
          {status}
        </span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {/* Animated Background Mesh - Desktop only */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <BuyCoinsModal
        isOpen={showBuyCoins}
        onClose={() => setShowBuyCoins(false)}
        onSuccess={handlePurchaseSuccess}
      />
      <BankingInfoModal
        isOpen={showBankingModal}
        onClose={() => setShowBankingModal(false)}
        onSuccess={handleBankingInfoSuccess}
        existingInfo={bankingInfo}
      />

      <div className="container max-w-7xl mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Tabs */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'balance'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:border-green-500/50'
            }`}
          >
            Balance
          </button>
          {isCreator && (
            <>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === 'payouts'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 scale-105'
                    : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:border-green-500/50'
                }`}
              >
                Payouts
              </button>
              <button
                onClick={() => setActiveTab('banking')}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === 'banking'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 scale-105'
                    : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:border-green-500/50'
                }`}
              >
                Banking
              </button>
            </>
          )}
        </div>

        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <>
            {/* Earnings with Period Selector - Creators Only */}
            {isCreator && (
              <div className="mb-8 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div className="flex gap-2 backdrop-blur-xl bg-white/10 rounded-lg p-1">
                    {[
                      { value: '24h', label: '24 Hours' },
                      { value: '1w', label: '1 Week' },
                      { value: '1m', label: '1 Month' },
                      { value: 'total', label: 'All Time' },
                    ].map((period) => (
                      <button
                        key={period.value}
                        onClick={() => setEarningsPeriod(period.value as '24h' | '1w' | '1m' | 'total')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          earningsPeriod === period.value
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                  <div className="flex items-baseline gap-2 sm:gap-3">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-400">{earnings.toLocaleString()}</span>
                    <span className="text-lg sm:text-xl md:text-2xl text-gray-300">coins</span>
                  </div>

                  <GlassButton
                    variant="gradient"
                    size="lg"
                    onClick={() => setShowBuyCoins(true)}
                    shimmer
                    className="whitespace-nowrap"
                  >
                    Buy Coins
                  </GlassButton>
                </div>
              </div>
            )}

            {/* Balance for Fans */}
            {!isCreator && (
              <GlassCard className="!bg-white/10 backdrop-blur-xl mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/5" />
                <div className="relative p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Balance</p>
                      </div>

                      <div className="flex items-center gap-6 mb-6">
                        <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl">
                          <Coins className="w-16 h-16 text-white" />
                        </div>

                        <div>
                          <div className="flex items-baseline gap-2 sm:gap-3 mb-1">
                            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 bg-clip-text text-transparent">
                              {balance.toLocaleString()}
                            </p>
                            {balance > 0 && (
                              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                            )}
                          </div>
                          <p className="text-lg sm:text-xl font-bold text-white">Digis Coins</p>
                          {balance > 0 && (
                            <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                              <Sparkles className="w-4 h-4 text-green-600" />
                              Keep earning and growing!
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <GlassButton
                        variant="gradient"
                        size="lg"
                        onClick={() => setShowBuyCoins(true)}
                        shimmer
                        className="whitespace-nowrap"
                      >
                        Buy Coins
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Transaction History */}
            <GlassCard className="!bg-white/10 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg">
                    <History className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Transaction History</h2>
                </div>
                {transactions.length > 0 && (
                  <span className="text-sm text-gray-400">{transactions.length} transactions</span>
                )}
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-6 bg-gradient-to-br from-gray-400/20 to-gray-500/20 rounded-2xl w-fit mx-auto mb-4">
                    <History className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-white mb-4 text-lg font-medium">No transactions yet</p>
                  <p className="text-gray-400">Your transactions will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className={`p-4 rounded-xl border bg-gradient-to-r ${getTransactionColor(tx.type, tx.amount)} hover:shadow-md transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 backdrop-blur-xl bg-white/10 rounded-xl shadow-sm">
                            {getTransactionIcon(tx.type, tx.amount)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold mb-1">
                              {tx.description || 'Transaction'}
                            </p>
                            <div className="flex items-center gap-3">
                              <p className="text-xs text-gray-400">
                                {new Date(tx.createdAt).toLocaleString()}
                              </p>
                              {getStatusBadge(tx.status)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-2xl font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-xs text-gray-400">coins</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && isCreator && (
          <div className="space-y-6">
            {/* Payout Request Card */}
            <GlassCard className="!bg-white/10 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-500/5" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Request Payout</h2>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                      <Coins className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Available for Payout</p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {balance.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-400">coins</p>
                    </div>
                  </div>
                  <GlassButton
                    variant="gradient"
                    size="lg"
                    onClick={async () => {
                      if (balance < 1000) {
                        showInfo('Minimum 1,000 coins required for payout');
                        return;
                      }
                      if (!bankingInfo) {
                        showInfo('Please add banking information first');
                        setActiveTab('banking');
                        return;
                      }
                      if (confirm(`Request payout of ${balance} coins?`)) {
                        try {
                          const response = await fetch('/api/wallet/payouts/request', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ amount: balance }),
                          });
                          if (response.ok) {
                            showSuccess('Payout requested successfully!');
                            await handleRefresh();
                          } else {
                            const error = await response.json();
                            showError(`Error: ${error.error}`);
                          }
                        } catch (err) {
                          showError('Failed to request payout');
                        }
                      }
                    }}
                    disabled={balance < 1000 || !bankingInfo}
                    shimmer
                    className="whitespace-nowrap"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Request Payout
                  </GlassButton>
                </div>
              </div>
            </GlassCard>

            {/* Payout History */}
            <GlassCard className="!bg-white/10 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                  <History className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-white">Payout History</h2>
              </div>

              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-6 bg-gradient-to-br from-gray-400/20 to-gray-500/20 rounded-2xl w-fit mx-auto mb-4">
                    <DollarSign className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-white text-lg font-medium mb-2">No payouts yet</p>
                  <p className="text-gray-400">Your payout requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-sm">
                            <DollarSign className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-bold text-lg mb-1">
                              {payout.amount.toLocaleString()} coins
                            </p>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                              </p>
                              {payout.completedAt && (
                                <p className="text-xs text-green-700 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Completed: {new Date(payout.completedAt).toLocaleDateString()}
                                </p>
                              )}
                              {payout.failureReason && (
                                <p className="text-xs text-red-700 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  {payout.failureReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* Banking Info Tab */}
        {activeTab === 'banking' && isCreator && (
          <GlassCard className="!bg-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-500/5" />
            <div className="relative p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Banking Information</h2>
              </div>

              {bankingInfo ? (
                <div className="space-y-6">
                  <div className="bg-green-500/10 border border-green-300 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <p className="text-green-800 font-medium">
                      Banking information {bankingInfo.isVerified ? 'verified and active' : 'added successfully'}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Account Holder
                      </p>
                      <p className="text-white font-semibold text-lg">{bankingInfo.accountHolderName}</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        Account Type
                      </p>
                      <p className="text-white font-semibold text-lg capitalize">{bankingInfo.accountType}</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        Bank Name
                      </p>
                      <p className="text-white font-semibold text-lg">{bankingInfo.bankName || 'Not specified'}</p>
                    </div>
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                        <Lock className="w-4 h-4" />
                        Account Number
                      </p>
                      <p className="text-white font-semibold text-lg font-mono">••••{bankingInfo.lastFourDigits}</p>
                    </div>
                  </div>

                  <GlassButton
                    variant="ghost"
                    onClick={() => setShowBankingModal(true)}
                    className="w-full md:w-auto"
                  >
                    Update Banking Information
                  </GlassButton>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl w-fit mx-auto mb-4">
                    <Building2 className="w-16 h-16 text-blue-600" />
                  </div>
                  <p className="text-white text-lg font-semibold mb-2">No Banking Information</p>
                  <p className="text-gray-400 mb-6">Add your banking information to start receiving payouts</p>
                  <GlassButton
                    variant="gradient"
                    size="lg"
                    onClick={() => setShowBankingModal(true)}
                    shimmer
                  >
                    Add Banking
                  </GlassButton>
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
