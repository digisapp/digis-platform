'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Coins, Gift, CheckCircle, Sparkles } from 'lucide-react';

export default function RedeemPage() {
  const searchParams = useSearchParams();
  const prefilledCode = searchParams.get('code') || '';

  const [code, setCode] = useState(prefilledCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; coinsAdded?: number; error?: string } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, coinsAdded: data.coinsAdded });
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch {
      setResult({ success: false, error: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <Gift className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Redeem Code</h1>
          <p className="text-gray-400">Enter your code to claim free coins</p>
        </div>

        {/* Success State */}
        {result?.success ? (
          <GlassCard className="p-8 text-center">
            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <Sparkles className="w-6 h-6 text-amber-400 absolute top-0 right-1/4 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Coins Added!</h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Coins className="w-8 h-8 text-amber-400" />
              <span className="text-4xl font-bold text-amber-400">
                +{result.coinsAdded?.toLocaleString()}
              </span>
            </div>
            <GlassButton
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={() => {
                setResult(null);
                setCode('');
              }}
            >
              Redeem Another Code
            </GlassButton>
          </GlassCard>
        ) : (
          /* Input Form */
          <GlassCard className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Redemption Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setResult(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                  placeholder="DIGIS-XXXX"
                  autoFocus
                  className="w-full px-4 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white text-center text-2xl font-mono font-bold tracking-widest placeholder-white/30 focus:outline-none focus:border-amber-500/60 focus:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all"
                />
              </div>

              {/* Error */}
              {result?.error && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-sm text-center">
                  {result.error}
                </div>
              )}

              <GlassButton
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={handleRedeem}
                disabled={!code.trim() || loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    Redeem Code
                  </>
                )}
              </GlassButton>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
