'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SignupModal } from '@/components/auth/SignupModal';
import { LoginModal } from '@/components/auth/LoginModal';

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
      router.push('/creator/apply');
    } else {
      localStorage.setItem('digis_creator_intent', 'true');
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
        redirectTo="/creator/apply"
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

      {/* How You Get Paid */}
      <div className="relative z-10 px-4 pt-12 md:pt-20 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3">
              How You Get Paid
            </h2>
            <p className="text-3xl md:text-4xl font-bold text-white">
              Your Content, Your Income
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paid Video Calls */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📹</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Paid Video Calls</h3>
                  <p className="text-white/60 text-sm">
                    Fans pay YOUR rate for 1-on-1 calls. 10 minutes, 30 minutes — you decide.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Twin */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🤖</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">AI Twin</h3>
                  <p className="text-white/60 text-sm">
                    Your AI answers DMs and takes voice calls 24/7. You literally make money in your sleep.
                  </p>
                </div>
              </div>
            </div>

            {/* Go Live */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🔥</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Go Live & Get Tips</h3>
                  <p className="text-white/60 text-sm">
                    Stream, vibe with fans, and watch the tips roll in.
                  </p>
                </div>
              </div>
            </div>

            {/* Sell Content */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 hover:border-pink-500/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">📸</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Sell Your Content</h3>
                  <p className="text-white/60 text-sm">
                    Photos, videos, fitness courses — whatever you create.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Types */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              How Creators Use Digis
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Content Creator */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/15 to-red-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🔥</span>
                <h3 className="text-lg font-bold text-white">Content Creator</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Your AI Twin chats with fans 24/7 while you sleep. Drop exclusive content, collect tips, and build your community.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">AI Twin</span>
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">Tips</span>
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium">Content</span>
              </div>
            </div>

            {/* Yoga Instructor */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500/15 to-cyan-500/5 border border-green-500/20 hover:border-green-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🧘‍♀️</span>
                <h3 className="text-lg font-bold text-white">Yoga Instructor</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Stream live yoga classes to followers worldwide. Sell recorded sessions as VODs for passive income.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">Live Stream</span>
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">VODs</span>
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">Tips</span>
              </div>
            </div>

            {/* Fitness Coach */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">💪</span>
                <h3 className="text-lg font-bold text-white">Fitness Coach</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Book 1-on-1 video training sessions. Share workout programs and meal plans as exclusive content.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">Video Calls</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">Content</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">Live Stream</span>
              </div>
            </div>

            {/* Fashion Creator */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/15 to-purple-500/5 border border-pink-500/20 hover:border-purple-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">👗</span>
                <h3 className="text-lg font-bold text-white">Fashion Creator</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Host GRWM live streams. Offer personal style consultations and drop exclusive outfit content for subscribers.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-medium">Live Stream</span>
                <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-medium">Content</span>
                <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-medium">Tips</span>
              </div>
            </div>

            {/* Influencer */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🌴</span>
                <h3 className="text-lg font-bold text-white">Influencer</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Go live from events and get tipped. Offer exclusive behind-the-scenes access and fan meet-and-greets via video calls.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">Live Stream</span>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">Virtual Gifts</span>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">Video Calls</span>
              </div>
            </div>

            {/* Life Coach */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🎯</span>
                <h3 className="text-lg font-bold text-white">Life Coach</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Run paid advisory calls and group coaching streams. Let your AI Twin handle intake questions around the clock.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">Video Calls</span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">Live Stream</span>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">AI Twin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgency Banner */}
      <div className="relative z-10 px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 text-center">
            <p className="text-white/90 text-lg">
              <span className="font-bold text-yellow-400">Usernames are first come, first serve</span> — the good ones are going fast!
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 px-4 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <button
            onClick={handleApplyClick}
            className="group px-12 py-5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold text-xl hover:scale-105 hover:shadow-[0_0_60px_rgba(168,85,247,0.7)] transition-all duration-300"
          >
            Claim Your Spot
          </button>
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
