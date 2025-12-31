'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import {
  Instagram,
  Gift,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Coins,
  Copy,
  Check
} from 'lucide-react';

interface Reward {
  id: string;
  rewardType: string;
  coinsAmount: number;
  description: string;
  isClaimed: boolean;
  isPending: boolean;
}

interface Submission {
  id: string;
  platform: string;
  screenshotUrl: string;
  socialHandle: string;
  status: 'pending' | 'approved' | 'rejected';
  coinsAwarded: number;
  rejectionReason: string | null;
  createdAt: string;
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

export default function ShareRewardsPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    // Fetch profile
    const response = await fetch('/api/user/profile');
    if (response.ok) {
      const data = await response.json();
      setUserProfile(data.user);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch('/api/creator/share-rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.availableRewards || []);
        setSubmissions(data.submissions || []);
        setTotalEarned(data.totalEarned || 0);
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
    setCopied(true);
    showToast('Link copied!', 'success');
    setTimeout(() => setCopied(false), 3000);
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

  const handleSubmit = async () => {
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
        fetchData();
      } else {
        showToast(data.error || 'Failed to submit', 'error');
      }
    } catch (error) {
      showToast('Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-green-400 text-xs">
            <CheckCircle className="w-3 h-3" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 mb-4">
            <Gift className="w-5 h-5 text-pink-400" />
            <span className="text-pink-400 font-semibold">Earn Free Coins</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Share & Earn Rewards
          </h1>
          <p className="text-gray-400">
            Share your Digis profile on social media and earn coins!
          </p>
        </div>

        {/* Your Link */}
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
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Total Earned */}
        {totalEarned > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Earned from Sharing</span>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl font-bold text-white">{totalEarned}</span>
              </div>
            </div>
          </div>
        )}

        {/* Available Rewards */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-white">Available Rewards</h2>

          {rewards.map((reward) => {
            const config = PLATFORM_CONFIG[reward.rewardType as keyof typeof PLATFORM_CONFIG];
            if (!config) return null;

            const Icon = config.icon;
            const isSelected = selectedPlatform === reward.rewardType;

            return (
              <div
                key={reward.id}
                className={`p-4 rounded-2xl border transition-all ${
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
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${config.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{config.name}</p>
                      <p className="text-sm text-gray-400">{reward.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {reward.isClaimed ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="w-4 h-4" /> Claimed
                      </span>
                    ) : reward.isPending ? (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Clock className="w-4 h-4" /> Pending
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Coins className="w-4 h-4" />
                        {reward.coinsAmount}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Form */}
                {isSelected && !reward.isClaimed && !reward.isPending && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                    <p className="text-sm text-cyan-400">{config.instructions}</p>

                    {/* Social Handle */}
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

                    {/* Screenshot Upload */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Upload Screenshot
                      </label>
                      {screenshotUrl ? (
                        <div className="relative">
                          <img
                            src={screenshotUrl}
                            alt="Screenshot"
                            className="w-full max-h-64 object-contain rounded-xl bg-black/30"
                          />
                          <button
                            onClick={() => setScreenshotUrl('')}
                            className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full text-white"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-cyan-500/50 transition-colors">
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
                              <Upload className="w-8 h-8 text-gray-500 mb-2" />
                              <span className="text-sm text-gray-500">Click to upload screenshot</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !screenshotUrl}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      {submitting ? 'Submitting...' : 'Submit for Review'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Past Submissions */}
        {submissions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Your Submissions</h2>
            {submissions.map((submission) => {
              const config = PLATFORM_CONFIG[submission.platform as keyof typeof PLATFORM_CONFIG];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <div
                  key={submission.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{config.name}</p>
                        {submission.socialHandle && (
                          <p className="text-xs text-gray-500">{submission.socialHandle}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(submission.status)}
                      {submission.status === 'approved' && (
                        <p className="text-xs text-green-400 mt-1">+{submission.coinsAwarded} coins</p>
                      )}
                    </div>
                  </div>
                  {submission.status === 'rejected' && submission.rejectionReason && (
                    <p className="mt-2 text-sm text-red-400 bg-red-500/10 p-2 rounded-lg">
                      {submission.rejectionReason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
