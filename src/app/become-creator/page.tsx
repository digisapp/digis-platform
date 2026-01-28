'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SignupModal } from '@/components/auth/SignupModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { Sparkles, Video, MessageCircle, DollarSign, Dumbbell, Camera, Heart, Flower2, Flame, Bot } from 'lucide-react';

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

      {/* Hero Section */}
      <div className="relative z-10 px-4 pt-12 md:pt-20 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 mb-8">
            <span className="text-2xl">🌍✨</span>
            <span className="text-sm font-medium text-white/90">Create Content While Traveling the World</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent">
              Get Paid to Be You
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
            Turn your time and content into actual income. Work from anywhere.
            <span className="text-digis-pink font-semibold"> Your rates, your rules.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={handleApplyClick}
              className="group px-10 py-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold text-lg hover:scale-105 hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-300"
            >
              Claim Your Spot 🚀
            </button>
          </div>

          {/* Social Proof */}
          <div className="inline-block px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-white/60 text-sm italic">
              "Finally a platform that actually pays creators what they deserve" ✨
            </p>
            <p className="text-white/40 text-xs mt-1">
              — Creators in Miami, LA, and NYC are already on Digis
            </p>
          </div>
        </div>
      </div>

      {/* What's the Vibe Section */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3">
              ⚡ What's the Vibe?
            </h2>
            <p className="text-3xl md:text-4xl font-bold text-white">
              Here's How You Get Paid
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <h3 className="text-lg font-bold text-white mb-1">AI Twin <span className="text-purple-400 text-sm">(This one's wild)</span></h3>
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
                  <h3 className="text-lg font-bold text-white mb-1">Go Live GRWM & Get Tips</h3>
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

            {/* Private Training */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🏋️</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Private Training Sessions</h3>
                  <p className="text-white/60 text-sm">
                    Fitness creators are booking paid video calls for personalized workouts and coaching.
                  </p>
                </div>
              </div>
            </div>

            {/* Virtual Dates */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">🍷</span>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Virtual Dates</h3>
                  <p className="text-white/60 text-sm">
                    Fans pay for virtual dinner dates and private video calls. Set your rate, keep your boundaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Types Section */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Creators Like You Are Already Earning
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Whether you're a model, influencer, fitness coach, or content creator — there's a way for you to get paid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Model Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/10 hover:border-pink-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Models & Influencers</h3>
                  <p className="text-sm text-pink-300">Glamour, Fashion, Lifestyle</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-white/70">
                <p>📸 Sell exclusive photosets & behind-the-scenes</p>
                <p>🔥 Go live for Q&As and GRWM</p>
                <p>📹 Offer paid 1-on-1 video calls</p>
                <p>🤖 AI Twin chats while you sleep</p>
              </div>
            </div>

            {/* Fitness Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-white/10 hover:border-green-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Fitness Creators</h3>
                  <p className="text-sm text-green-300">Training, Yoga, Wellness</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-white/70">
                <p>🏋️ Host live workout classes</p>
                <p>📱 Sell workout plans & guides</p>
                <p>📹 Private coaching video calls</p>
                <p>🧘 Meditation & wellness content</p>
              </div>
            </div>

            {/* Virtual Date Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-white/10 hover:border-red-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Virtual Companions</h3>
                  <p className="text-sm text-red-300">Dates, Conversation, Connection</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-white/70">
                <p>🍷 Virtual dinner dates</p>
                <p>💬 Premium per-minute rates</p>
                <p>🎯 Set your own boundaries</p>
                <p>🤖 AI Twin handles overflow</p>
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
              👀 <span className="font-bold text-yellow-400">Usernames are first come, first serve</span> — the good ones are going fast!
            </p>
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
            Join creators who are turning their content into real income.
            Free to join. Takes 2 minutes.
          </p>

          <button
            onClick={handleApplyClick}
            className="group px-12 py-5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-bold text-xl hover:scale-105 hover:shadow-[0_0_60px_rgba(168,85,247,0.7)] transition-all duration-300"
          >
            Claim Your Spot 🚀
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
