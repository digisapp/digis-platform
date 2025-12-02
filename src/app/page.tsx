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
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
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
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Animated background effects on top of video */}
        <div className="absolute inset-0 overflow-hidden z-[1]">
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
                src="/images/digis-logo-white.png"
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
                className="px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-white text-blue-700 font-bold text-sm md:text-base hover:scale-105 transition-all shadow-lg"
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
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black mb-6 pb-2 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent leading-relaxed animate-gradient">
              what's your digis?
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto font-semibold leading-relaxed">
              Connect with your favorite Creators via Live Streaming, Video Calls, Live Events and Chats
            </p>

          </div>
        </div>
      </div>

    </div>
  );
}
