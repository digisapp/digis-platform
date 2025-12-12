'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';

function CancelledContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [returnUrl, setReturnUrl] = useState<string>('/wallet');
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
  }, [searchParams]);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Navigate back
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

  const handleGoBack = () => {
    if (returnUrl.startsWith('http')) {
      window.location.href = returnUrl;
    } else {
      router.push(returnUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 top-1/4 left-1/4 bg-red-500 opacity-20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20 flex items-center justify-center min-h-screen">
        <GlassCard glow="pink" padding="lg" className="max-w-2xl w-full text-center">
          {/* Cancel Icon */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center text-6xl mx-auto mb-6">
            ❌
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Payment Cancelled
          </h1>

          <p className="text-xl text-gray-300 mb-4">
            Your payment was cancelled. No charges were made.
          </p>

          <p className="text-gray-400 mb-8">
            Returning in {countdown} seconds...
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={handleGoBack}
            >
              Go Back Now
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default function CancelledPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <CancelledContent />
    </Suspense>
  );
}
