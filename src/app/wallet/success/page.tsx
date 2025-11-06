'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GlassCard, GlassButton } from '@/components/ui';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // Trigger confetti or celebration animation
      console.log('Payment successful:', sessionId);
    }
  }, [sessionId]);

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

          <p className="text-xl text-gray-300 mb-8">
            Your Digis Coins have been added to your wallet. Start connecting with creators now!
          </p>

          {/* Coin Animation */}
          <div className="flex items-center justify-center space-x-2 mb-8 py-6 glass rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl shimmer">
              🪙
            </div>
            <span className="text-3xl font-bold text-white">Coins Added!</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => router.push('/wallet')}
            >
              View Wallet
            </GlassButton>
            <GlassButton
              variant="cyan"
              size="lg"
              onClick={() => router.push('/')}
            >
              Explore Creators
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
