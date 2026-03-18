'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Users, Gift, Copy, Check, Share2, Coins, Trophy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferred: number;
    completed: number;
    pending: number;
    totalEarned: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    referredUsername: string | null;
    referredDisplayName: string | null;
    referredAvatarUrl: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
  rewards: {
    referrerReward: number;
    referredReward: number;
  };
}

export default function ReferralsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral/fan')
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then(d => d && setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data) return;
    try {
      await navigator.share({
        title: 'Join me on Digis!',
        text: `Sign up on Digis and we both get ${data.rewards.referredReward} free coins!`,
        url: data.referralLink,
      });
    } catch {
      handleCopy();
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

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-10 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Invite Friends</h1>
        </div>

        {/* Hero Card */}
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 text-center">
          <Gift className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">
            Get {data?.rewards.referrerReward} coins for every friend!
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Your friend gets {data?.rewards.referredReward} coins too. Win-win.
          </p>

          {/* Referral Link */}
          <div className="flex items-center gap-2 bg-black/30 rounded-xl p-3 mb-4">
            <code className="flex-1 text-sm text-cyan-400 truncate text-left">
              {data?.referralLink}
            </code>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            Share Invite Link
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{data?.stats.totalReferred || 0}</p>
            <p className="text-xs text-gray-400">Invited</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-2xl font-bold text-green-400">{data?.stats.completed || 0}</p>
            <p className="text-xs text-gray-400">Joined</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <div className="flex items-center justify-center gap-1">
              <Coins className="w-4 h-4 text-yellow-400" />
              <p className="text-2xl font-bold text-yellow-400">{data?.stats.totalEarned || 0}</p>
            </div>
            <p className="text-xs text-gray-400">Earned</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">How it works</h3>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Share your unique invite link with friends' },
              { step: '2', text: 'They sign up using your link' },
              { step: '3', text: `You both get ${data?.rewards.referrerReward || 50} free coins instantly` },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
                  {item.step}
                </div>
                <p className="text-sm text-gray-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referral History */}
        {data && data.referrals.length > 0 && (
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Your Referrals</h3>
            </div>
            <div className="divide-y divide-white/5">
              {data.referrals.filter(r => r.referredUsername).map(ref => (
                <div key={ref.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                    {ref.referredAvatarUrl ? (
                      <img src={ref.referredAvatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                        {(ref.referredDisplayName || ref.referredUsername || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {ref.referredDisplayName || ref.referredUsername}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(ref.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    ref.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {ref.status === 'completed' ? 'Joined' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
