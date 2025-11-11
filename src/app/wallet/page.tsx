'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard, GlassButton, WalletWidget, LoadingSpinner } from '@/components/ui';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import { BankingInfoModal } from '@/components/wallet/BankingInfoModal';
import { RefreshCw, DollarSign, History, Building2, Coins, Sparkles, TrendingUp } from 'lucide-react';

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

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Check if user is creator
      const profileResponse = await fetch('/api/user/profile');
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setIsCreator(profile.user?.role === 'creator');
      }

      await fetchWalletData();
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      // Fetch balance
      const balanceResponse = await fetch('/api/wallet/balance');
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.balance || 0);
      }

      // Fetch transactions
      const transactionsResponse = await fetch('/api/wallet/transactions?limit=50');
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }

      // Fetch payouts if creator
      if (isCreator) {
        const payoutsResponse = await fetch('/api/wallet/payouts');
        if (payoutsResponse.ok) {
          const payoutsData = await payoutsResponse.json();
          setPayouts(payoutsData.payouts || []);
        }

        // Fetch banking info
        const bankingResponse = await fetch('/api/wallet/banking-info');
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return '💰';
      case 'gift': return '🎁';
      case 'call_charge': return '📞';
      case 'stream_tip': return '⭐';
      case 'ppv_unlock': return '🔓';
      case 'creator_payout': return '💸';
      case 'refund': return '↩️';
      default: return '💵';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
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

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">My Wallet</h1>
            <p className="text-gray-700">Manage your Digis Coins {isCreator && 'and payouts'}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="glass glass-hover p-3 rounded-xl text-digis-cyan hover:glow-cyan transition-all disabled:opacity-50"
            title="Refresh wallet data"
          >
            <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'balance'
                ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white'
                : 'bg-white/5 text-gray-700 hover:bg-white/10 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-5 h-5 inline mr-2" />
            Balance
          </button>
          {isCreator && (
            <>
              <button
                onClick={() => setActiveTab('payouts')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'payouts'
                    ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white'
                    : 'bg-white/5 text-gray-700 hover:bg-white/10 hover:text-gray-900'
                }`}
              >
                <History className="w-5 h-5 inline mr-2" />
                Payouts
              </button>
              <button
                onClick={() => setActiveTab('banking')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'banking'
                    ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white'
                    : 'bg-white/5 text-gray-700 hover:bg-white/10 hover:text-gray-900'
                }`}
              >
                <Building2 className="w-5 h-5 inline mr-2" />
                Banking Info
              </button>
            </>
          )}
        </div>

        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <>
            {/* Balance Card */}
            <div className="mb-8 relative overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-amber-500/20 to-orange-500/20 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

              <GlassCard glow="cyan" padding="lg" className="relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Your Balance</p>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Coin Icon with Glow */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full blur-xl opacity-60 animate-pulse" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-2xl">
                          <Coins className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                      </div>

                      {/* Balance Amount */}
                      <div>
                        <div className="flex items-baseline gap-3 mb-1">
                          <p className="text-6xl md:text-7xl font-black bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 bg-clip-text text-transparent drop-shadow-sm">
                            {balance.toLocaleString()}
                          </p>
                          {balance > 0 && (
                            <TrendingUp className="w-8 h-8 text-green-500 animate-bounce" />
                          )}
                        </div>
                        <p className="text-lg font-bold text-gray-700 tracking-wide">Digis Coins</p>
                        {balance > 0 && (
                          <p className="text-sm text-gray-600 mt-1">💎 Keep earning and growing!</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex flex-col gap-3">
                    <GlassButton
                      variant="gradient"
                      size="lg"
                      onClick={() => setShowBuyCoins(true)}
                      shimmer
                      className="whitespace-nowrap"
                    >
                      <Coins className="w-5 h-5 mr-2" />
                      Buy More Coins
                    </GlassButton>
                    {isCreator && balance >= 1000 && (
                      <button
                        onClick={() => setActiveTab('payouts')}
                        className="px-4 py-2 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors flex items-center gap-2 justify-center"
                      >
                        <DollarSign className="w-4 h-4" />
                        Request Payout
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Transaction History */}
            <GlassCard glow="none" padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>

              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-700 mb-4">No transactions yet</p>
                  <GlassButton variant="cyan" onClick={() => setShowBuyCoins(true)}>
                    Buy Your First Coins
                  </GlassButton>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="glass glass-hover p-4 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">{getTransactionIcon(tx.type)}</div>
                        <div>
                          <p className="text-gray-900 font-medium">
                            {tx.description || 'Transaction'}
                          </p>
                          <p className="text-sm text-gray-700">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount} coins
                        </p>
                        <p className="text-sm text-gray-700 capitalize">{tx.status}</p>
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
          <div className="space-y-8">
            {/* Payout Request Card */}
            <GlassCard glow="cyan" padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Payout</h2>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-blue-700 text-sm">
                  <strong>Payout Schedule:</strong> Digis processes payouts twice per month (1st and 15th).
                  <br />
                  <strong>Minimum:</strong> 1,000 coins required to request payout.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 mb-1">Available for Payout</p>
                  <p className="text-4xl font-bold text-gray-900">{balance.toLocaleString()} coins</p>
                </div>
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={async () => {
                    if (balance < 1000) {
                      alert('Minimum 1,000 coins required for payout');
                      return;
                    }
                    if (!bankingInfo) {
                      alert('Please add banking information first');
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
                          alert('Payout requested successfully!');
                          await handleRefresh();
                        } else {
                          const error = await response.json();
                          alert(`Error: ${error.error}`);
                        }
                      } catch (err) {
                        alert('Failed to request payout');
                      }
                    }
                  }}
                  disabled={balance < 1000 || !bankingInfo}
                  shimmer
                >
                  Request Payout
                </GlassButton>
              </div>
            </GlassCard>

            {/* Payout History */}
            <GlassCard glow="none" padding="lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payout History</h2>

              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-700">No payouts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="glass glass-hover p-4 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-gray-900 font-medium">{payout.amount.toLocaleString()} coins</p>
                        <p className="text-sm text-gray-700">
                          Requested: {new Date(payout.requestedAt).toLocaleDateString()}
                        </p>
                        {payout.completedAt && (
                          <p className="text-sm text-gray-700">
                            Completed: {new Date(payout.completedAt).toLocaleDateString()}
                          </p>
                        )}
                        {payout.failureReason && (
                          <p className="text-sm text-red-600">{payout.failureReason}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payout.status)}`}>
                          {payout.status.toUpperCase()}
                        </span>
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
          <GlassCard glow="cyan" padding="lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Banking Information</h2>

            {bankingInfo ? (
              <div className="space-y-6">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                  <p className="text-green-700 flex items-center">
                    <span className="mr-2">✓</span>
                    Banking information {bankingInfo.isVerified ? 'verified' : 'added'}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-700 mb-1">Account Holder</p>
                    <p className="text-gray-900 font-medium">{bankingInfo.accountHolderName}</p>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-1">Account Type</p>
                    <p className="text-gray-900 font-medium capitalize">{bankingInfo.accountType}</p>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-1">Bank</p>
                    <p className="text-gray-900 font-medium">{bankingInfo.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-1">Account</p>
                    <p className="text-gray-900 font-medium">••••{bankingInfo.lastFourDigits}</p>
                  </div>
                </div>

                <GlassButton
                  variant="ghost"
                  onClick={() => setShowBankingModal(true)}
                >
                  Update Banking Information
                </GlassButton>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-700">Add your banking information to receive payouts</p>
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={() => setShowBankingModal(true)}
                  shimmer
                >
                  Add Banking Information
                </GlassButton>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
