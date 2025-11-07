'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard, GlassButton, WalletWidget, LoadingSpinner } from '@/components/ui';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
  status: string;
}

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyCoins, setShowBuyCoins] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      // Check if user is authenticated
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      await fetchWalletData();
    } catch (error) {
      console.error('Error:', error);
      router.push('/');
    }
  };

  const fetchWalletData = async () => {
    try {
      // TODO: Implement API routes to get wallet balance and transactions
      // For now, using mock data
      setBalance(250);
      setTransactions([
        {
          id: '1',
          amount: 250,
          type: 'purchase',
          description: 'Purchased 250 coins',
          createdAt: new Date().toISOString(),
          status: 'completed',
        },
      ]);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '💰';
      case 'gift':
        return '🎁';
      case 'call_charge':
        return '📞';
      case 'stream_tip':
        return '⭐';
      case 'ppv_unlock':
        return '🔓';
      case 'creator_payout':
        return '💸';
      case 'refund':
        return '↩️';
      default:
        return '💵';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <BuyCoinsModal isOpen={showBuyCoins} onClose={() => setShowBuyCoins(false)} />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-digis-cyan opacity-20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-digis-pink opacity-20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">My Wallet</h1>
          <p className="text-gray-400">Manage your Digis Coins and view transaction history</p>
        </div>

        {/* Balance Card */}
        <GlassCard glow="cyan" padding="lg" className="mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <p className="text-gray-400 mb-2">Available Balance</p>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl">
                  🪙
                </div>
                <div>
                  <p className="text-5xl font-bold text-white">{balance.toLocaleString()}</p>
                  <p className="text-gray-400">Digis Coins</p>
                </div>
              </div>
            </div>
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => setShowBuyCoins(true)}
              shimmer
            >
              Buy More Coins
            </GlassButton>
          </div>
        </GlassCard>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <GlassCard glow="cyan" padding="md">
            <p className="text-gray-400 mb-2">Total Spent</p>
            <p className="text-3xl font-bold text-white">$0.00</p>
          </GlassCard>
          <GlassCard glow="pink" padding="md">
            <p className="text-gray-400 mb-2">Video Calls</p>
            <p className="text-3xl font-bold text-white">0</p>
          </GlassCard>
          <GlassCard glow="purple" padding="md">
            <p className="text-gray-400 mb-2">Gifts Sent</p>
            <p className="text-3xl font-bold text-white">0</p>
          </GlassCard>
        </div>

        {/* Transaction History */}
        <GlassCard glow="none" padding="lg">
          <h2 className="text-2xl font-bold text-white mb-6">Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No transactions yet</p>
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
                      <p className="text-white font-medium">
                        {tx.description || 'Transaction'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} coins
                    </p>
                    <p className="text-sm text-gray-400 capitalize">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
