'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import {
  Users,
  Gift,
  Coins,
  Copy,
  Check,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Share2,
  ExternalLink,
} from 'lucide-react';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalBonusEarned: number;
  totalCommissionEarned: number;
  totalEarned: number;
}

interface Referral {
  id: string;
  status: string;
  signupBonusPaid: boolean;
  signupBonusAmount: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  revenueShareExpiresAt: string | null;
  createdAt: string;
  activatedAt: string | null;
  referred: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export default function ReferralsPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/creator/referrals');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setReferrals(data.referrals || []);
        setReferralLink(data.referralLink || '');
      } else if (response.status === 403) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    showToast('Link copied!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Digis!',
          text: 'Sign up as a creator on Digis and start earning!',
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or share failed
        copyReferralLink();
      }
    } else {
      copyReferralLink();
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
    return months > 0 ? `${months} months left` : 'Expired';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-semibold">Creator Referrals</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Invite & Earn
          </h1>
          <p className="text-gray-400">
            Earn 100 coins + 5% of their earnings for 12 months
          </p>
        </div>

        {/* Referral Link */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
          <p className="text-sm text-gray-400 mb-3">Your Referral Link:</p>
          <div className="flex items-center gap-2 mb-4">
            <code className="flex-1 px-4 py-3 bg-black/30 rounded-xl text-cyan-400 font-mono text-sm truncate">
              {referralLink.replace('https://', '')}
            </code>
            <button
              onClick={copyReferralLink}
              className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={shareReferralLink}
              className="p-3 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Share this link with other creators. When they sign up and start earning, you earn too!
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalReferrals}</p>
              <p className="text-xs text-gray-400">Total Referrals</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.activeReferrals}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalBonusEarned}</p>
              <p className="text-xs text-gray-400">Bonus Coins</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.totalEarned}</p>
              <p className="text-xs text-gray-400">Total Earned</p>
            </div>
          </div>
        )}

        {/* How it Works */}
        <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Share your link</p>
                <p className="text-sm text-gray-400">Send your referral link to other creators</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-white font-medium">They become a creator</p>
                <p className="text-sm text-gray-400">You get 100 coins when they're approved</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Earn 5% of their earnings</p>
                <p className="text-sm text-gray-400">For 12 months, paid monthly when you hit 100+ coins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your Referrals</h2>

          {referrals.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No referrals yet</p>
              <p className="text-sm text-gray-500">Share your link to start earning!</p>
            </div>
          ) : (
            referrals.map((referral) => (
              <div
                key={referral.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {referral.referred?.avatarUrl ? (
                      <img
                        src={referral.referred.avatarUrl}
                        alt={referral.referred.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {referral.referred?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        @{referral.referred?.username || 'unknown'}
                      </span>
                      {referral.status === 'active' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                          Active
                        </span>
                      )}
                      {referral.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                          Pending
                        </span>
                      )}
                      {referral.status === 'expired' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(referral.createdAt)}
                      </span>
                      {referral.revenueShareExpiresAt && referral.status === 'active' && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Clock className="w-3 h-3" />
                          {getTimeRemaining(referral.revenueShareExpiresAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-400 font-bold">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      {(referral.signupBonusPaid ? referral.signupBonusAmount : 0) + (referral.totalCommissionEarned || 0)}
                    </div>
                    <p className="text-xs text-gray-500">earned</p>
                  </div>
                </div>

                {/* Earnings breakdown */}
                {referral.status === 'active' && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4 text-xs text-gray-400">
                    {referral.signupBonusPaid && (
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-yellow-400" />
                        +{referral.signupBonusAmount} bonus
                      </span>
                    )}
                    {referral.totalCommissionEarned > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        +{referral.totalCommissionEarned} commissions
                      </span>
                    )}
                    {referral.pendingCommission > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {referral.pendingCommission} pending
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
