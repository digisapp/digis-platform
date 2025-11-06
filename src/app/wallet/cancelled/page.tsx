'use client';

import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton } from '@/components/ui';

export default function CancelledPage() {
  const router = useRouter();

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

          <p className="text-xl text-gray-300 mb-8">
            Your payment was cancelled. No charges were made to your account.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => router.push('/wallet')}
            >
              Try Again
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="lg"
              onClick={() => router.push('/')}
            >
              Back to Home
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
