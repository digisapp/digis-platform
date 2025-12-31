'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import {
  Gift,
  Users,
  Coins,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Instagram,
  Share2,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface ShareReward {
  id: string;
  rewardType: string;
  coinsAmount: number;
  description: string;
  isClaimed: boolean;
  isPending: boolean;
}

interface ShareSubmission {
  id: string;
  platform: string;
  status: 'pending' | 'approved' | 'rejected';
  coinsAwarded: number;
  rejectionReason: string | null;
  createdAt: string;
}

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

const PLATFORM_CONFIG = {
  instagram_story: {
    name: 'Instagram Story',
    icon: Instagram,
    color: 'from-pink-500 to-purple-500',
    instructions: 'Post your Digis link on your Instagram Story and screenshot it',
  },
  instagram_bio: {
    name: 'Instagram Bio',
    icon: Instagram,
    color: 'from-purple-500 to-pink-500',
    instructions: 'Add your Digis link to your Instagram bio and screenshot it',
  },
  tiktok_bio: {
    name: 'TikTok Bio',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
      </svg>
    ),
    color: 'from-black to-gray-800',
    instructions: 'Add your Digis link to your TikTok bio and screenshot it',
  },
};

export default function EarnPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Share rewards state
  const [rewards, setRewards] = useState<ShareReward[]>([]);
  const [submissions, setSubmissions] = useState<ShareSubmission[]>([]);
  const [totalShareEarned, setTotalShareEarned] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      const [profileRes, shareRes, referralRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/creator/share-rewards'),
        fetch('/api/creator/referrals'),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setUserProfile(data.user);
      }

      if (shareRes.ok) {
        const data = await shareRes.json();
        setRewards(data.availableRewards || []);
        setSubmissions(data.submissions || []);
        setTotalShareEarned(data.totalEarned || 0);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setScreenshotUrl(data.url);
        showToast('Screenshot uploaded!', 'success');
      } else {
        showToast('Failed to upload screenshot', 'error');
      }
    } catch (error) {
      showToast('Failed to upload screenshot', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitShare = async () => {
    if (!selectedPlatform || !screenshotUrl) {
      showToast('Please upload a screenshot', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/creator/share-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          screenshotUrl,
          socialHandle,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'Submitted! We\'ll review it soon.', 'success');
        setSelectedPlatform(null);
        setScreenshotUrl('');
        setSocialHandle('');
        fetchAllData();
      } else {
        showToast(data.error || 'Failed to submit', 'error');
      }
    } catch (error) {
      showToast('Failed to submit', 'error');
    } finally {
      setSubmitting(false);
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

  const totalEarned = totalShareEarned + (referralStats?.totalCommissionEarned || 0);

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-green-500/20 border border-yellow-500/30 mb-4">
            <Gift className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Promote & Earn</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Earn Extra Coins
          </h1>
          <p className="text-gray-400">
            Share your link and invite creators to earn
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

        {/* ===== SHARE REWARDS SECTION ===== */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Share on Social Media</h2>
              <p className="text-sm text-gray-400">Earn 100 coins per platform</p>
            </div>
          </div>

          <div className="space-y-3">
            {rewards.map((reward) => {
              const config = PLATFORM_CONFIG[reward.rewardType as keyof typeof PLATFORM_CONFIG];
              if (!config) return null;

              const Icon = config.icon;
              const isSelected = selectedPlatform === reward.rewardType;

              return (
                <div
                  key={reward.id}
                  className={`p-4 rounded-xl border transition-all ${
                    reward.isClaimed
                      ? 'bg-green-500/10 border-green-500/30'
                      : reward.isPending
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : isSelected
                      ? 'bg-white/10 border-cyan-500/50'
                      : 'bg-white/5 border-white/10 hover:border-white/30 cursor-pointer'
                  }`}
                  onClick={() => !reward.isClaimed && !reward.isPending && setSelectedPlatform(reward.rewardType)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-white">{config.name}</span>
                    </div>
                    <div>
                      {reward.isClaimed ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" /> Claimed
                        </span>
                      ) : reward.isPending ? (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <Clock className="w-4 h-4" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400 font-bold">
                          <Coins className="w-4 h-4" /> {reward.coinsAmount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission Form */}
                  {isSelected && !reward.isClaimed && !reward.isPending && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                      <p className="text-sm text-cyan-400">{config.instructions}</p>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Your {config.name.split(' ')[0]} Username
                        </label>
                        <input
                          type="text"
                          value={socialHandle}
                          onChange={(e) => setSocialHandle(e.target.value)}
                          placeholder="@username"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Upload Screenshot</label>
                        {screenshotUrl ? (
                          <div className="relative">
                            <img
                              src={screenshotUrl}
                              alt="Screenshot"
                              className="w-full max-h-48 object-contain rounded-xl bg-black/30"
                            />
                            <button
                              onClick={() => setScreenshotUrl('')}
                              className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full text-white"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={uploading}
                            />
                            {uploading ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-500 mb-1" />
                                <span className="text-xs text-gray-500">Click to upload</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>

                      <button
                        onClick={handleSubmitShare}
                        disabled={submitting || !screenshotUrl}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Submit for Review'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
            <p>• <span className="text-pink-400">Share rewards:</span> Post your link on social media, upload a screenshot, earn 100 coins instantly when approved</p>
            <p>• <span className="text-purple-400">Referrals:</span> Invite other creators, earn 5% of everything they make for 12 months</p>
          </div>
        </div>
      </div>
    </div>
  );
}
