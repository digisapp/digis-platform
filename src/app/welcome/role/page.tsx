'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = async (role: 'fan' | 'creator') => {
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      if (role === 'fan') {
        // Fans go directly to dashboard
        router.push('/dashboard');
      } else {
        // Creators go to application flow
        router.push('/creator/apply');
      }
    } catch (error) {
      console.error('Error during role selection:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Mesh - Tron Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={150}
            height={50}
            className="mx-auto mb-6 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]"
          />
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Welcome to Digis
          </h1>
          <p className="text-xl text-gray-300 font-medium">
            Choose how you want to experience the platform
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Fan Option */}
          <button
            onClick={() => handleRoleSelection('fan')}
            disabled={loading}
            className="group relative backdrop-blur-xl bg-white/5 border-2 border-cyan-500/30 rounded-3xl p-8 md:p-10 hover:border-cyan-500/60 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {/* Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
              I'm a Fan
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Connect with your favorite creators, watch live streams, and access exclusive content
            </p>

            {/* Features */}
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-gray-300 font-medium">Watch live streams</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-gray-300 font-medium">Book video calls</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-gray-300 font-medium">Access exclusive content</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-gray-300 font-medium">Support creators with tips</span>
              </div>
            </div>

            {/* Button Indicator */}
            <div className="mt-8 pt-6 border-t border-cyan-500/30">
              <span className="text-cyan-400 font-bold text-lg group-hover:text-cyan-300 transition-colors">
                Continue as Fan →
              </span>
            </div>
          </button>

          {/* Creator Option */}
          <button
            onClick={() => handleRoleSelection('creator')}
            disabled={loading}
            className="group relative backdrop-blur-xl bg-white/5 border-2 border-purple-500/30 rounded-3xl p-8 md:p-10 hover:border-purple-500/60 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {/* Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
              I'm a Creator
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Build your audience, monetize your content, and connect directly with your fans
            </p>

            {/* Features */}
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span className="text-gray-300 font-medium">Go live and stream</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span className="text-gray-300 font-medium">Offer paid video calls</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span className="text-gray-300 font-medium">Sell exclusive content</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span className="text-gray-300 font-medium">Earn from subscriptions</span>
              </div>
            </div>

            {/* Button Indicator */}
            <div className="mt-8 pt-6 border-t border-purple-500/30">
              <span className="text-purple-400 font-bold text-lg group-hover:text-purple-300 transition-colors">
                Apply as Creator →
              </span>
            </div>
          </button>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/dashboard')}
            disabled={loading}
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
