'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import {
  Users,
  Coins,
  Copy,
  Check,
  Share2,
  Calendar,
} from 'lucide-react';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommissionEarned: number;
}

interface Referral {
  id: string;
  status: string;
  totalCommissionEarned: number;
  pendingCommission: number;
  revenueShareExpiresAt: string | null;
  createdAt: string;
  referred: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export default function EarnPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Referral state
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralLink, setReferralLink] = useState('');

  // UI state
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch all data in parallel
      const [profileRes, referralRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/creator/referrals'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setUserProfile(data.user);
      }

      if (referralRes.ok) {
        const data = await referralRes.json();
        setReferralStats(data.stats);
        setReferrals(data.referrals || []);
        setReferralLink(data.referralLink || '');
      } else if (referralRes.status === 403) {
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyProfileLink = async () => {
    if (!userProfile?.username) return;
    const link = `https://digis.cc/${userProfile.username}`;
    await navigator.clipboard.writeText(link);
    setCopiedProfile(true);
    showToast('Profile link copied!', 'success');
    setTimeout(() => setCopiedProfile(false), 3000);
  };

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopiedReferral(true);
    showToast('Referral link copied!', 'success');
    setTimeout(() => setCopiedReferral(false), 3000);
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
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const months = Math.max(0, Math.round((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return months > 0 ? `${months}mo left` : 'Expired';
  };

  const totalEarned = referralStats?.totalCommissionEarned || 0;

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
            Invite Creators
          </h1>
          <p className="text-gray-400">
            Earn 5% of their earnings for 12 months
          </p>
        </div>

        {/* Total Earned Banner */}
        {totalEarned > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Earned from Promoting</span>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl font-bold text-white">{totalEarned}</span>
              </div>
            </div>
          </div>
        )}

        {/* Your Profile Link */}
        {userProfile?.username && (
          <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-sm text-gray-400 mb-2">Your Digis Link:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-black/30 rounded-xl text-cyan-400 font-mono text-sm truncate">
                digis.cc/{userProfile.username}
              </code>
              <button
                onClick={copyProfileLink}
                className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              >
                {copiedProfile ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* ===== REFERRALS SECTION ===== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Invite Creators</h2>
              <p className="text-sm text-gray-400">Earn 5% of their earnings for 12 months</p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
            <p className="text-sm text-gray-400 mb-2">Your Invite Link:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-black/30 rounded-xl text-purple-400 font-mono text-sm truncate">
                {referralLink.replace('https://', '')}
              </code>
              <button
                onClick={copyReferralLink}
                className="p-3 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
              >
                {copiedReferral ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={shareReferralLink}
                className="p-3 rounded-xl bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Referral Stats */}
          {referralStats && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xl font-bold text-white">{referralStats.totalReferrals}</p>
                <p className="text-xs text-gray-400">Invited</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-xl font-bold text-white">{referralStats.activeReferrals}</p>
                <p className="text-xs text-gray-400">Active</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-xl font-bold text-green-400">{referralStats.totalCommissionEarned}</p>
                <p className="text-xs text-gray-400">Earned</p>
              </div>
            </div>
          )}

          {/* Referrals List */}
          {referrals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-2">Your Referrals:</p>
              {referrals.slice(0, 5).map((referral) => (
                <div
                  key={referral.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3"
                >
                  {referral.referred?.avatarUrl ? (
                    <img
                      src={referral.referred.avatarUrl}
                      alt={referral.referred.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-400">
                        {referral.referred?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      @{referral.referred?.username || 'unknown'}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(referral.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">
                      +{referral.totalCommissionEarned || 0}
                    </p>
                    {referral.status === 'active' && referral.revenueShareExpiresAt && (
                      <p className="text-xs text-cyan-400">
                        {getTimeRemaining(referral.revenueShareExpiresAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {referrals.length > 5 && (
                <p className="text-center text-sm text-gray-500 pt-2">
                  +{referrals.length - 5} more referrals
                </p>
              )}
            </div>
          )}

          {referrals.length === 0 && (
            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No referrals yet</p>
              <p className="text-xs text-gray-500">Share your invite link to start earning!</p>
            </div>
          )}
        </div>

        {/* How it Works */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">How It Works</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>1. Share your unique invite link with other creators</p>
            <p>2. When they sign up and start earning, you get <span className="text-purple-400">5% of their earnings</span></p>
            <p>3. Commission lasts for <span className="text-purple-400">12 months</span> per referral</p>
          </div>
        </div>
      </div>
    </div>
  );
}
