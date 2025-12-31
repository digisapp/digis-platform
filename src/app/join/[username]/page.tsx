'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Gift, Sparkles, Users, DollarSign } from 'lucide-react';
import Image from 'next/image';

export default function ReferralJoinPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [referrer, setReferrer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    const processReferral = async () => {
      try {
        // Validate the referrer exists and is a creator
        const response = await fetch(`/api/referral/validate?code=${username}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError(data.error || 'Invalid referral link');
          setLoading(false);
          // Still redirect after 3 seconds
          setTimeout(() => router.push('/become-creator'), 3000);
          return;
        }

        setReferrer(data.referrer);

        // Store referral in cookie (30 days)
        document.cookie = `referral_code=${username}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;

        // Also store in localStorage as backup
        localStorage.setItem('referral_code', username);
        localStorage.setItem('referral_timestamp', Date.now().toString());

        setLoading(false);

        // Auto-redirect after showing the referrer info
        setTimeout(() => router.push('/become-creator'), 2500);
      } catch (err) {
        console.error('Error processing referral:', err);
        setError('Something went wrong');
        setLoading(false);
        setTimeout(() => router.push('/become-creator'), 3000);
      }
    };

    processReferral();
  }, [username, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {loading ? (
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Processing your invitation...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Gift className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Hmm, that link didn't work</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500">Redirecting you to sign up...</p>
          </div>
        ) : referrer ? (
          <div className="text-center">
            {/* Referrer card */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-purple-500/30">
              <div className="flex items-center justify-center gap-4 mb-4">
                {referrer.avatarUrl ? (
                  <img
                    src={referrer.avatarUrl}
                    alt={referrer.displayName || referrer.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                    {referrer.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-1">You've been invited by</p>
              <h2 className="text-xl font-bold text-white">
                {referrer.displayName || `@${referrer.username}`}
              </h2>
            </div>

            {/* Welcome message */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-4">
                <Sparkles className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Welcome to Digis!</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Join as a Creator
              </h1>
              <p className="text-gray-400">
                Create your profile, go live, and start earning from your fans.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Earn Coins</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Build Fanbase</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Gift className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Get Gifts</p>
              </div>
            </div>

            {/* Redirect notice */}
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <LoadingSpinner size="sm" />
              <span className="text-sm">Taking you to sign up...</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
