'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Coins } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Get return URL from query params
    const returnParam = searchParams.get('returnUrl');
    if (returnParam) {
      try {
        const decoded = decodeURIComponent(returnParam);
        // Only allow relative URLs or same-origin URLs for security
        if (decoded.startsWith('/') || decoded.includes('digis.cc')) {
          setReturnUrl(decoded);
        }
      } catch {
        // Keep default
      }
    }

    if (sessionId) {
      console.log('Payment successful:', sessionId);
    }
  }, [sessionId, searchParams]);

  // Auto-redirect countdown if there's a return URL
  useEffect(() => {
    if (!returnUrl) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (returnUrl.startsWith('http')) {
            window.location.href = returnUrl;
          } else {
            router.push(returnUrl);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [returnUrl, router]);

  const handleContinue = () => {
    if (returnUrl) {
      if (returnUrl.startsWith('http')) {
        window.location.href = returnUrl;
      } else {
        router.push(returnUrl);
      }
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 top-1/4 left-1/4 bg-green-500 opacity-20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/2 right-1/4 bg-digis-cyan opacity-20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 flex items-center justify-center min-h-screen">
        <GlassCard glow="cyan" padding="lg" className="max-w-2xl w-full text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-6xl mx-auto mb-6 animate-bounce">
            ✅
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Payment Successful!
          </h1>

          <p className="text-xl text-gray-300 mb-4">
            Your Digis Coins have been added to your wallet!
          </p>

          {returnUrl && (
            <p className="text-gray-400 mb-6">
              Returning in {countdown} seconds...
            </p>
          )}

          {/* Coin Animation */}
          <div className="flex items-center justify-center gap-3 mb-8 py-6 glass rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <Coins className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Coins Added!</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={handleContinue}
            >
              {returnUrl ? 'Continue' : 'Start Exploring'}
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="lg"
              onClick={() => router.push('/wallet')}
            >
              View Wallet
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
