'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SignupModal } from '@/components/auth/SignupModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { Camera, Dumbbell, Heart } from 'lucide-react';

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

      {/* Creator Types */}
      <div className="relative z-10 px-4 pt-12 md:pt-20 pb-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-white text-center mb-12">
            Turn your audience into income
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Models & Influencers */}
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

            {/* Fitness Creators */}
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

            {/* Virtual Companions */}
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

      {/* CTA */}
      <div className="relative z-10 px-4 pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 mb-8">
            <p className="text-white/90 text-lg">
              <span className="font-bold text-yellow-400">Usernames are first come, first serve</span> — the good ones are going fast!
            </p>
          </div>
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
            © 2026 Digis. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
