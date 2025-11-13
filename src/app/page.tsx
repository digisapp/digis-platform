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
        <div className="text-gray-800 text-xl font-semibold">Loading...</div>
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
        <div className="relative z-10 container mx-auto px-4 pt-6 md:pt-12 pb-20 md:pb-32">
          {/* Navigation */}
          <nav className="glass rounded-full px-6 py-4 mb-20 max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/images/digis-logo-black.png"
                alt="Digis Logo"
                width={120}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowLogin(true)}
                className="glass-hover glass px-6 py-2 rounded-full text-gray-800 font-semibold"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="bg-gradient-to-r from-digis-cyan to-digis-pink px-6 py-2 rounded-full text-white font-semibold hover:shadow-glow-cyan transition-all"
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
            <p className="text-xl md:text-2xl text-gray-700 mb-20 max-w-3xl mx-auto font-medium">
              Experience personalized video calls, live streams, and exclusive content from your favorite creators. Powered by Digis Coins.
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-20">
              {/* Video Calls */}
              <div className="glass glass-hover p-8 rounded-2xl border-2 border-transparent hover:border-digis-cyan hover:shadow-glow-cyan transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-digis-cyan to-digis-blue mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Video Calls</h3>
                <p className="text-gray-600">Connect face-to-face with creators in private 1-on-1 video calls</p>
              </div>

              {/* Live Streaming */}
              <div className="glass glass-hover p-8 rounded-2xl border-2 border-transparent hover:border-digis-pink hover:shadow-glow-pink transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-digis-pink to-digis-purple mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Live Streams</h3>
                <p className="text-gray-600">Watch live performances and interact with virtual gifts</p>
              </div>

              {/* Exclusive Content */}
              <div className="glass glass-hover p-8 rounded-2xl border-2 border-transparent hover:border-digis-purple hover:shadow-glow-purple transition-all">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-digis-purple to-digis-pink mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Exclusive Content</h3>
                <p className="text-gray-600">Access premium content and messages from creators</p>
              </div>
            </div>

            {/* Coin Showcase */}
            <div className="mt-20 glass p-12 rounded-3xl border-2 border-digis-yellow hover:shadow-glow-purple transition-all">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-digis-yellow to-digis-orange flex items-center justify-center shimmer">
                  <Coins className="w-12 h-12 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Powered by Digis Coins</h2>
              <p className="text-xl text-gray-700 max-w-2xl mx-auto">
                Our secure digital currency makes transactions seamless. Buy coins once, use them across all creator interactions.
              </p>
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
    </div>
  );
}
