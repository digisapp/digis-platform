'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SignupModal } from '@/components/auth/SignupModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { Sparkles, Video, MessageCircle, DollarSign, Shield, Dumbbell, Shirt, Camera, Heart, Flower2 } from 'lucide-react';

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
            Build your community. Live stream and receive virtual gifts. Monetize your Digitals. Video calls with your fans and students. Earn while you sleep with AI Twin.
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

      {/* Creator Scenarios Section */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Real Creators, Real Income
          </h2>
          <p className="text-white/50 text-center mb-12 max-w-2xl mx-auto">
            See how creators like you are combining multiple revenue streams to build sustainable income on Digis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Model Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/10 hover:border-pink-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">The Model</h3>
                  <p className="text-sm text-pink-300">Glamour, Fashion, Fitness</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-pink-400 mt-0.5">▸</span>
                  <span>Sell <strong className="text-white">exclusive photosets</strong> and behind-the-scenes Digitals</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-400 mt-0.5">▸</span>
                  <span>Go <strong className="text-white">live</strong> for Q&As, GRWM and OOTD sessions</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-400 mt-0.5">▸</span>
                  <span>Offer <strong className="text-white">paid video calls</strong> for personal time with you</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-pink-400 mt-0.5">▸</span>
                  <span>Your <strong className="text-white">AI Twin</strong> chats 24/7 - earn while you sleep</span>
                </div>
              </div>
            </div>

            {/* Influencer Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/10 hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Shirt className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">The Influencer</h3>
                  <p className="text-sm text-cyan-300">Fashion, Lifestyle, Beauty</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">▸</span>
                  <span>Host <strong className="text-white">live Q&As</strong> about style and skincare routines</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">▸</span>
                  <span>Charge for <strong className="text-white">paid DMs</strong> for personalized outfit feedback</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">▸</span>
                  <span>Sell <strong className="text-white">exclusive photos</strong> and lookbooks</span>
                </div>
              </div>
            </div>

            {/* Virtual Date Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-white/10 hover:border-red-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Virtual Dates</h3>
                  <p className="text-sm text-red-300">Dinner Dates, Companionship</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">▸</span>
                  <span>Add <strong className="text-white">"Virtual Dinner Date"</strong> to your tip menu for romantic video time</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">▸</span>
                  <span>Charge <strong className="text-white">premium per-minute rates</strong> for 1-on-1 video calls</span>
                </div>
              </div>
            </div>

            {/* Health & Fitness Coach Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-white/10 hover:border-green-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Fitness Coach</h3>
                  <p className="text-sm text-green-300">Personal Training, Health</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">▸</span>
                  <span>Host <strong className="text-white">live workout classes</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">▸</span>
                  <span>Sell <strong className="text-white">personalized workout plans</strong> as digital downloads</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">▸</span>
                  <span>Book <strong className="text-white">private coaching video calls</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">▸</span>
                  <span><strong className="text-white">Subscriber only</strong> exclusive workout streams</span>
                </div>
              </div>
            </div>

            {/* Yoga & Pilates Instructor Scenario */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-white/10 hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Flower2 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Yoga & Pilates</h3>
                  <p className="text-sm text-purple-300">Mindfulness, Flexibility</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>Stream <strong className="text-white">live yoga sessions</strong> - morning flows, evening stretches, meditation</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>Sell <strong className="text-white">guided meditation audio and video</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>Offer <strong className="text-white">private video sessions</strong> for personalized instruction</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>Your <strong className="text-white">AI Twin</strong> talks with your students about your personalized guides</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Potential Callout */}
          <div className="mt-12 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-digis-cyan/10 via-digis-purple/10 to-digis-pink/10 border border-white/10 text-center">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              Stack Your Revenue Streams
            </h3>
            <p className="text-white/60 max-w-2xl mx-auto">
              The most successful creators on Digis don't rely on just one income source.
              They combine live streaming, paid messages, calls, subscriptions, and their AI Twin
              to earn around the clock—even while they sleep.
            </p>
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

            {/* AI Twin */}
            <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Twin</h3>
              <p className="text-white/50">
                Your AI chats with fans 24/7. Earn while you sleep. Never miss a message.
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
