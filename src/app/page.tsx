'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';

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
        // User is logged in, redirect to wallet
        router.push('/wallet');
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
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
        <div className="relative z-10 container mx-auto px-4 py-20">
          {/* Navigation */}
          <nav className="glass rounded-full px-6 py-4 mb-20 max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-digis-cyan to-digis-pink flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <span className="text-white font-bold text-xl">Digis</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLogin(true)}
                className="glass-hover glass px-6 py-2 rounded-full text-white font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-gradient-to-r from-digis-cyan to-digis-pink px-6 py-2 rounded-full text-white font-medium hover:shadow-glow-cyan transition-all"
              >
                Get Started
              </button>
            </div>
          </nav>

          {/* Hero */}
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent">
              Connect With Creators
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Experience personalized video calls, live streams, and exclusive content from your favorite creators. Powered by Digis Coins.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <button className="w-full sm:w-auto glass-hover glass px-8 py-4 rounded-full text-white font-medium text-lg border-2 border-digis-cyan glow-cyan">
                Browse Creators
              </button>
              <button className="w-full sm:w-auto bg-gradient-to-r from-digis-pink to-digis-purple px-8 py-4 rounded-full text-white font-medium text-lg glow-pink">
                Become a Creator
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-20">
              {/* Video Calls */}
              <div className="glass glass-hover p-8 rounded-2xl border-2 border-transparent hover:border-digis-cyan transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-digis-cyan to-digis-blue mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Video Calls</h3>
                <p className="text-gray-400">Connect face-to-face with creators in private 1-on-1 video calls</p>
              </div>

              {/* Live Streaming */}
              <div className="glass glass-hover p-8 rounded-2xl border-2 border-transparent hover:border-digis-pink transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-digis-pink to-digis-purple mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Live Streams</h3>
                <p className="text-gray-400">Watch live performances and interact with virtual gifts</p>
              </div>

              {/* Exclusive Content */}
              <div className="glass glass-hover p-8 rounded-2xl border-2 border-transparent hover:border-digis-purple transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-digis-purple to-digis-pink mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Exclusive Content</h3>
                <p className="text-gray-400">Access premium content and messages from creators</p>
              </div>
            </div>

            {/* Coin Showcase */}
            <div className="mt-20 glass p-12 rounded-3xl border-2 border-digis-cyan glow-cyan">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl shimmer">
                  🪙
                </div>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Powered by Digis Coins</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Our secure digital currency makes transactions seamless. Buy coins once, use them across all creator interactions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500">
          <p>&copy; 2025 Digis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
