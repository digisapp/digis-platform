'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { Coins } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Get user role to redirect appropriately
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            const role = data.user?.role;

            // Redirect based on role
            if (role === 'admin') {
              router.push('/admin');
            } else if (role === 'creator') {
              router.push('/creator/dashboard');
            } else {
              router.push('/dashboard');
            }
          } else {
            // Fallback to dashboard if profile fetch fails
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          router.push('/dashboard');
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/images/digis-logo-black.png"
            alt="Digis"
            width={120}
            height={40}
            className="animate-breathe"
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      {/* Auth Modals */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-digis-cyan opacity-20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 top-1/3 right-10 bg-digis-pink opacity-20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-digis-purple opacity-20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 pt-6 md:pt-12 pb-24 md:pb-32">
          {/* Navigation */}
          <nav className="glass rounded-full px-6 md:px-8 py-4 mb-16 md:mb-24 max-w-4xl mx-auto flex items-center justify-between backdrop-blur-xl border-2 border-white/50 shadow-xl">
            <div className="flex items-center">
              <Image
                src="/images/digis-logo-black.png"
                alt="Digis Logo"
                width={120}
                height={40}
                className="h-8 md:h-10 w-auto"
                priority
              />
            </div>
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                onClick={() => setShowLogin(true)}
                className="glass-hover glass px-4 md:px-6 py-2 md:py-2.5 rounded-full text-gray-800 font-bold text-sm md:text-base hover:scale-105 transition-all border-2 border-purple-200"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink px-4 md:px-6 py-2 md:py-2.5 rounded-full text-white font-bold text-sm md:text-base hover:scale-105 hover:shadow-2xl transition-all shadow-lg"
              >
                Get Started
              </button>
            </div>
          </nav>

          {/* Hero */}
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent leading-tight animate-gradient">
              Connect With Creators
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto font-semibold leading-relaxed">
              Experience personalized video calls, live streams, and exclusive content.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => setShowSignup(true)}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-2xl hover:shadow-digis-cyan/50"
              >
                Start for Free →
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="w-full sm:w-auto px-8 py-4 glass border-2 border-purple-300 text-gray-900 rounded-2xl font-bold text-lg hover:scale-105 transition-all hover:border-digis-cyan"
              >
                Sign In
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 text-gray-600 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span className="font-semibold">Instant Access</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">24/7 Support</span>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-24">
              {/* Video Calls */}
              <div className="group glass p-8 rounded-3xl border-2 border-purple-200 hover:border-digis-cyan hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-xl">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-digis-cyan to-blue-500 mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Video Calls</h3>
                <p className="text-gray-700 font-medium leading-relaxed">Connect face-to-face with creators in private 1-on-1 video calls</p>
              </div>

              {/* Live Streaming */}
              <div className="group glass p-8 rounded-3xl border-2 border-purple-200 hover:border-digis-pink hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-xl">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-digis-pink to-digis-purple mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Live Streams</h3>
                <p className="text-gray-700 font-medium leading-relaxed">Watch live performances and interact with virtual gifts</p>
              </div>

              {/* Exclusive Content */}
              <div className="group glass p-8 rounded-3xl border-2 border-purple-200 hover:border-digis-purple hover:shadow-2xl transition-all duration-300 hover:scale-105 backdrop-blur-xl">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-digis-purple to-digis-pink mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Exclusive Content</h3>
                <p className="text-gray-700 font-medium leading-relaxed">Access premium content and messages from creators</p>
              </div>
            </div>

            {/* Coin Showcase */}
            <div className="mt-24 glass p-12 md:p-16 rounded-3xl border-2 border-yellow-300 hover:border-yellow-400 hover:shadow-2xl transition-all backdrop-blur-xl">
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 flex items-center justify-center shadow-2xl">
                    <Coins className="w-14 h-14 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">Powered by Digis Coins</h2>
              <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto font-semibold leading-relaxed">
                Our secure digital currency makes transactions seamless. Buy coins once, use them across all creator interactions.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-bold">Fast & Secure</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="font-bold">No Hidden Fees</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="font-bold">Universal Currency</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-300 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Digis. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.98);
          }
        }

        .animate-breathe {
          animation: breathe 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
