'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import {
  Users,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Coins,
  Gift,
  TrendingUp,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  expiredReferrals: number;
  totalBonusesPaid: number;
  totalCommissionsPaid: number;
  totalPendingCommissions: number;
}

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
}

interface Referral {
  id: string;
  status: string;
  referralCode: string;
  signupBonusPaid: boolean;
  signupBonusAmount: number;
  revenueSharePercent: string;
  revenueShareExpiresAt: string | null;
  totalCommissionEarned: number;
  pendingCommission: number;
  createdAt: string;
  activatedAt: string | null;
  referrer: UserInfo | null;
  referred: UserInfo | null;
}

export default function AdminReferralsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'expired'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/referrals');
      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals || []);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const months = Math.max(0, Math.round((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return months > 0 ? `${months}mo left` : 'Expired';
  };

  const filteredReferrals = referrals.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center md:pl-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />
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
            <h1 className="text-2xl font-bold text-white">Referral Program</h1>
            <p className="text-sm text-gray-400">View all creator referrals</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-400">{stats.totalReferrals}</p>
              <p className="text-sm text-gray-400">Total Referrals</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.activeReferrals}</p>
              <p className="text-sm text-gray-400">Active</p>
            </div>
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.totalBonusesPaid}</p>
              <p className="text-sm text-gray-400">Bonuses Paid</p>
            </div>
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-cyan-400">{stats.totalCommissionsPaid}</p>
              <p className="text-sm text-gray-400">Commissions Paid</p>
            </div>
          </div>
        )}

        {/* Pending Commissions Alert */}
        {stats && stats.totalPendingCommissions > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-white font-medium">
                  {stats.totalPendingCommissions} coins in pending commissions
                </p>
                <p className="text-sm text-gray-400">
                  Will be paid out when referrers reach 100+ coin threshold
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'active', 'pending', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status}
              {status !== 'all' && stats && (
                <span className="ml-2 text-xs opacity-70">
                  ({status === 'active' ? stats.activeReferrals :
                    status === 'pending' ? stats.pendingReferrals :
                    stats.expiredReferrals})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Referrals List */}
        {filteredReferrals.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No referrals found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReferrals.map((referral) => (
              <div
                key={referral.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Referrer */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {referral.referrer?.avatarUrl ? (
                        <Image
                          src={referral.referrer.avatarUrl}
                          alt={referral.referrer.username}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-400">
                            {referral.referrer?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">
                          @{referral.referrer?.username || 'unknown'}
                        </p>
                        <p className="text-xs text-gray-500">Referrer</p>
                      </div>
                    </div>

                    {/* Arrow and Referred */}
                    <div className="flex items-center gap-3 ml-5 pl-5 border-l border-white/10">
                      <span className="text-gray-500">→</span>
                      {referral.referred ? (
                        <div className="flex items-center gap-2">
                          {referral.referred.avatarUrl ? (
                            <Image
                              src={referral.referred.avatarUrl}
                              alt={referral.referred.username}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center">
                              <span className="text-xs font-bold text-cyan-400">
                                {referral.referred.username?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-white">@{referral.referred.username}</p>
                            <p className="text-xs text-gray-500">{referral.referred.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">Not signed up yet</span>
                      )}
                    </div>
                  </div>

                  {/* Status & Stats */}
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2 justify-end">
                      {getStatusIcon(referral.status)}
                      <span className={`text-sm font-medium capitalize ${
                        referral.status === 'active' ? 'text-green-400' :
                        referral.status === 'pending' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {referral.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(referral.createdAt)}
                    </div>

                    {referral.revenueShareExpiresAt && referral.status === 'active' && (
                      <div className="text-xs text-cyan-400">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {getTimeRemaining(referral.revenueShareExpiresAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Earnings Row */}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-6 text-sm">
                  {referral.signupBonusPaid && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Gift className="w-3 h-3" />
                      +{referral.signupBonusAmount} bonus
                    </span>
                  )}
                  {referral.totalCommissionEarned > 0 && (
                    <span className="flex items-center gap-1 text-green-400">
                      <TrendingUp className="w-3 h-3" />
                      +{referral.totalCommissionEarned} commissions
                    </span>
                  )}
                  {referral.pendingCommission > 0 && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <Clock className="w-3 h-3" />
                      {referral.pendingCommission} pending
                    </span>
                  )}
                  <span className="text-gray-500 ml-auto">
                    {referral.revenueSharePercent}% share
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
