'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupRedirectTo, setSignupRedirectTo] = useState('/explore');
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch user role to redirect appropriately
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            const role = data.user?.role;

            // Redirect based on role
            if (role === 'admin') {
              router.replace('/admin');
            } else if (role === 'creator') {
              router.replace('/creator/dashboard');
            } else {
              router.replace('/explore');
            }
          } else {
            router.replace('/explore');
          }
        } catch {
          router.replace('/explore');
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 blur-xl bg-cyan-400/40 scale-150" />
            <Image
              src="/images/digis-logo-white.png"
              alt="Digis"
              width={120}
              height={40}
              className="relative animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
              priority
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
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
        redirectTo={signupRedirectTo}
      />

      {/* Full-screen Hero Section */}
      <div className="relative h-screen overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/digis-video-celebs.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
        </div>

        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden z-[1] pointer-events-none">
          <div className="absolute w-[500px] h-[500px] -top-20 -left-20 bg-digis-cyan opacity-15 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute w-[400px] h-[400px] top-1/4 -right-20 bg-digis-pink opacity-15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute w-[600px] h-[600px] -bottom-40 left-1/4 bg-digis-purple opacity-10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Navigation - Fixed at top */}
        <nav className="absolute top-0 left-0 right-0 z-20 px-4 py-4 md:py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/images/digis-logo-white.png"
                alt="Digis Logo"
                width={140}
                height={46}
                className="h-10 md:h-12 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                priority
              />
            </div>
            <div className="flex items-center space-x-3 md:space-x-4">
              <button
                onClick={() => setShowLogin(true)}
                className="px-5 md:px-7 py-2.5 md:py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold text-sm md:text-base hover:bg-white/20 hover:scale-105 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setSignupRedirectTo('/explore');
                  setShowSignup(true);
                }}
                className="px-5 md:px-7 py-2.5 md:py-3 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-sm md:text-base hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </nav>

        {/* Centered Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-black mb-6 pb-2 leading-normal font-[family-name:var(--font-poppins)]"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #FF006E 50%, #9D4EDD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(0, 212, 255, 0.5)) drop-shadow(0 0 60px rgba(255, 0, 110, 0.3))',
              }}
            >
              what's your digis?
            </h1>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={() => {
                  setSignupRedirectTo('/explore');
                  setShowSignup(true);
                }}
                className="group px-10 py-4 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all duration-300"
              >
                Start Exploring
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button
                onClick={() => {
                  setSignupRedirectTo('/creator/apply');
                  setShowSignup(true);
                }}
                className="px-10 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold text-lg hover:bg-white/20 hover:scale-105 transition-all duration-300"
              >
                Become a Creator
              </button>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">
                Live Streams
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">
                Video Calls
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">
                Chats
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">
                Exclusive Events
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">
                Virtual Gifts
              </span>
              <span className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium">
                Digitals
              </span>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
              <div className="w-1.5 h-3 bg-white/60 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
