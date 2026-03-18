'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Camera, Dumbbell, Heart } from 'lucide-react';

interface MarketingPageProps {
  onLogin: () => void;
  onSignup: (_redirectTo: string) => void;
}

export function MarketingPage({ onLogin, onSignup }: MarketingPageProps) {
  return (
    <div className="min-h-screen bg-black">
      <div className="relative h-screen overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
        </div>

        <div className="absolute inset-0 overflow-hidden z-[1] pointer-events-none">
          <div className="absolute w-[500px] h-[500px] -top-20 -left-20 bg-digis-cyan opacity-15 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute w-[400px] h-[400px] top-1/4 -right-20 bg-digis-pink opacity-15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute w-[600px] h-[600px] -bottom-40 left-1/4 bg-digis-purple opacity-10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

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
                onClick={onLogin}
                className="px-5 md:px-7 py-2.5 md:py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold text-sm md:text-base hover:bg-white/20 hover:scale-105 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onSignup('/welcome')}
                className="px-5 md:px-7 py-2.5 md:py-3 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-sm md:text-base hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </nav>

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-3 pb-2 leading-normal font-[family-name:var(--font-poppins)]"
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 md:mb-10 mt-6 md:mt-8">
              <button
                onClick={() => onSignup('/creator/apply')}
                className="relative w-full sm:w-auto px-10 py-4 md:py-4 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(0,212,255,0.4),0_0_60px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(0,212,255,0.6),0_0_80px_rgba(168,85,247,0.5)] animate-glow-pulse text-center"
              >
                Become a Creator
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {['Live Streams', 'Video Calls', 'Chats', 'Exclusive Events', 'Virtual Gifts', 'Digitals'].map((feature, index) => (
                <span
                  key={feature}
                  className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium animate-fade-in-up hover:bg-white/20 hover:border-white/30 transition-all cursor-default"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gradient divider between hero and content */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Lifestyle Use Cases Section */}
      <div className="relative bg-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[600px] h-[600px] top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-digis-purple opacity-[0.07] rounded-full blur-[120px]" />
          <div className="absolute w-[400px] h-[400px] bottom-20 -left-40 bg-digis-cyan opacity-[0.05] rounded-full blur-[100px]" />
          <div className="absolute w-[400px] h-[400px] bottom-40 -right-40 bg-digis-pink opacity-[0.05] rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-10 pb-20 md:pt-14 md:pb-28">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 font-[family-name:var(--font-poppins)]"
              style={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #FF006E 50%, #9D4EDD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              How Creators Use Digis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/10 hover:border-pink-500/30 transition-all hover:scale-[1.02]">
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

            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-white/10 hover:border-green-500/30 transition-all hover:scale-[1.02]">
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

            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-white/10 hover:border-red-500/30 transition-all hover:scale-[1.02]">
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

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <Image
                src="/images/digis-logo-white.png"
                alt="Digis"
                width={100}
                height={34}
                className="h-8 w-auto opacity-60 mb-3"
              />
              <p className="text-white/40 text-sm">A Global Content Creator Community</p>
            </div>

            <div className="flex gap-10 text-sm">
              <div className="flex flex-col gap-2">
                <span className="text-white/50 font-semibold text-xs uppercase tracking-wider mb-1">Platform</span>
                <Link href="/explore" className="text-white/40 hover:text-white transition-colors">Explore</Link>
                <button onClick={() => onSignup('/creator/apply')} className="text-white/40 hover:text-white transition-colors">Become a Creator</button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-white/50 font-semibold text-xs uppercase tracking-wider mb-1">Legal</span>
                <Link href="/terms" className="text-white/40 hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="text-white/40 hover:text-white transition-colors">Privacy</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs">
              &copy; {new Date().getFullYear()} Digis. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
