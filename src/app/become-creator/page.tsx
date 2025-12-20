'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function BecomeCreatorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-40 -left-40 bg-digis-cyan opacity-15 rounded-full blur-[120px]" />
        <div className="absolute w-[500px] h-[500px] top-1/3 -right-40 bg-digis-pink opacity-15 rounded-full blur-[120px]" />
        <div className="absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-digis-purple opacity-10 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 px-4 py-4 md:py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={120}
            height={40}
            className="h-8 md:h-10 w-auto cursor-pointer"
            onClick={() => router.push('/')}
            priority
          />
          <button
            onClick={() => router.push('/creator/apply')}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-sm hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
          >
            Apply Now
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 px-4 pt-16 md:pt-24 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent">
            Get Paid to Be You
          </h1>
          <p className="text-xl md:text-2xl text-white/70 mb-16 max-w-xl mx-auto">
            Monetize your content. Connect with fans. Build your empire.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            {/* Live Streaming */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-4xl mb-3">🎥</div>
              <h3 className="text-white font-bold mb-1">Live Streams</h3>
              <p className="text-white/50 text-sm">Earn tips & sell tickets</p>
            </div>

            {/* Video Calls */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="text-white font-bold mb-1">Video Calls</h3>
              <p className="text-white/50 text-sm">Set your own rate</p>
            </div>

            {/* Paid Messages */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-white font-bold mb-1">Paid Chats</h3>
              <p className="text-white/50 text-sm">Charge per message</p>
            </div>

            {/* Exclusive Content */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-white font-bold mb-1">PPV Content</h3>
              <p className="text-white/50 text-sm">Sell exclusive content</p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/creator/apply')}
            className="group px-12 py-5 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-xl hover:scale-105 hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-300"
          >
            Apply Now
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <p className="text-white/40 text-sm mt-6">
            Join thousands of creators already earning on Digis
          </p>
        </div>
      </div>
    </div>
  );
}
