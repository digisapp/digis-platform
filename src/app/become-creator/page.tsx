'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SignupModal } from '@/components/auth/SignupModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { Sparkles, Video, MessageCircle, DollarSign, Clock, Shield, TrendingUp } from 'lucide-react';

export default function BecomeCreatorPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
  }, []);

  const handleApplyClick = () => {
    if (isLoggedIn) {
      router.push('/creator/dashboard');
    } else {
      setShowSignup(true);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Auth Modals */}
      <SignupModal
        isOpen={showSignup}
        onClose={() => setShowSignup(false)}
        onSwitchToLogin={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
        redirectTo="/creator/dashboard"
        defaultRole="creator"
      />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToSignup={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[800px] h-[800px] -top-60 -left-60 bg-digis-cyan opacity-20 rounded-full blur-[150px]" />
        <div className="absolute w-[600px] h-[600px] top-1/4 -right-60 bg-digis-pink opacity-20 rounded-full blur-[150px]" />
        <div className="absolute w-[500px] h-[500px] bottom-0 left-1/4 bg-digis-purple opacity-15 rounded-full blur-[120px]" />
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
            onClick={handleApplyClick}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-sm hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-4 pt-12 md:pt-20 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-digis-cyan" />
            <span className="text-sm text-white/80">The Future of Creator Monetization</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent">
              Get Paid to Be You
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Monetize your content. Connect with fans. Build your empire with AI Twin, live streams, video calls, and exclusive content.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleApplyClick}
              className="group px-10 py-4 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-lg hover:scale-105 hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-300"
            >
              Start Earning Today
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Twin Feature - Hero Card */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-digis-purple/20 via-digis-pink/10 to-digis-cyan/20 border border-white/10 backdrop-blur-xl overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-digis-cyan/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-digis-pink/30 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-digis-cyan to-digis-purple flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">AI Twin</h2>
                  <p className="text-digis-cyan text-sm font-medium">Your 24/7 Money Machine</p>
                </div>
              </div>

              <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl">
                Train an AI version of yourself so AI can respond exactly like you! It chats with fans,
                sends voice messages, and earns money while you focus on creating content or just living your life.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <Clock className="w-5 h-5 text-digis-cyan" />
                  <span className="text-white/80">Never miss a message</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-white/80">Passive income 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Everything You Need to Monetize
          </h2>
          <p className="text-white/50 text-center mb-12 max-w-xl mx-auto">
            Multiple revenue streams, one platform. Keep more of what you earn.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Live Streaming */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-digis-cyan/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live Streaming</h3>
              <p className="text-white/50">
                Go live and earn from virtual gifts. Sell tickets to exclusive streams. Build real connections.
              </p>
            </div>

            {/* Video Calls */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-digis-pink/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-digis-pink/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6 text-digis-pink" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">1-on-1 Video Calls</h3>
              <p className="text-white/50">
                Set your own rate per minute. Fans book time with you directly. Premium personal experience.
              </p>
            </div>

            {/* Paid Messages */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-digis-purple/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-digis-purple/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-digis-purple" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Paid Messaging</h3>
              <p className="text-white/50">
                Charge per message. Fans pay to slide into your DMs. Your time is valuable.
              </p>
            </div>

            {/* Exclusive Content */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-digis-cyan/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-digis-cyan/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-digis-cyan" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Digitals</h3>
              <p className="text-white/50">
                Sell exclusive photos and videos. Set your own prices. Fans unlock premium content.
              </p>
            </div>

            {/* Tips & Gifts */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-green-500/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tips & Gifts</h3>
              <p className="text-white/50">
                Fans send coins anytime. On streams, in DMs, on your profile. Every interaction can earn.
              </p>
            </div>

            {/* Analytics */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-500/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Creator Analytics</h3>
              <p className="text-white/50">
                Track your earnings, top fans, and growth. Know what content performs best.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 px-4 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
            Join creators who are building real income on Digis.
            Set up takes 5 minutes.
          </p>

          <button
            onClick={handleApplyClick}
            className="group px-12 py-5 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-xl hover:scale-105 hover:shadow-[0_0_60px_rgba(168,85,247,0.7)] transition-all duration-300"
          >
            Create Your Account
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <p className="text-white/30 text-sm mt-6">
            Free to join. No credit card required.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis"
            width={80}
            height={28}
            className="h-6 w-auto opacity-50"
          />
          <p className="text-white/30 text-sm">
            © 2025 Digis. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
