'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Navigation } from '@/components/layout/Navigation';
import { LoadingSpinner } from '@/components/ui';
import {
  Play,
  Users,
  Sparkles,
  ChevronRight,
  Radio,
  Eye,
} from 'lucide-react';

// Types
interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isCreatorVerified: boolean;
  isOnline?: boolean;
  isLive?: boolean;
  primaryCategory?: string | null;
  followerCount?: number;
}

interface Stream {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  currentViewers: number;
  startedAt: string;
  category: string | null;
  creator: Creator;
}

interface HomepageData {
  liveStreams: Stream[];
  followedCreators: (Creator & { isLive: boolean })[];
  discoverCreators: Creator[];
  counts: {
    liveStreams: number;
    followedCreators: number;
    discoverCreators: number;
  };
}

// Fan Dashboard Component
function FanDashboard() {
  const [data, setData] = useState<HomepageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/fan/homepage');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds for live data
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasLiveStreams = data && data.liveStreams.length > 0;
  const hasFollowedCreators = data && data.followedCreators.length > 0;
  const hasDiscoverCreators = data && data.discoverCreators.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f]">
      <MobileHeader />
      <Navigation />

      <main className="pt-16 pb-24 md:pb-8 md:pl-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Live Now Section */}
          {hasLiveStreams && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Radio className="w-5 h-5 text-red-500" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Live Now</h2>
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                    {data.counts.liveStreams}
                  </span>
                </div>
                <Link
                  href="/live"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  See All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.liveStreams.map((stream) => (
                  <Link
                    key={stream.id}
                    href={`/live/${stream.id}`}
                    className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/50 transition-all hover:scale-[1.02]"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video relative">
                      {stream.thumbnailUrl ? (
                        <Image
                          src={stream.thumbnailUrl}
                          alt={stream.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center">
                          <Play className="w-12 h-12 text-white/40" />
                        </div>
                      )}
                      {/* Live Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-white">LIVE</span>
                      </div>
                      {/* Viewer Count */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded-md text-xs text-white">
                        <Eye className="w-3 h-3" />
                        {stream.currentViewers}
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <Link href={`/${stream.creator.username}`} onClick={(e) => e.stopPropagation()}>
                          {stream.creator.avatarUrl ? (
                            <Image
                              src={stream.creator.avatarUrl}
                              alt={stream.creator.displayName || stream.creator.username}
                              width={36}
                              height={36}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                              {(stream.creator.displayName || stream.creator.username)?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                            {stream.title || 'Untitled Stream'}
                          </h3>
                          <p className="text-sm text-gray-400 truncate">
                            @{stream.creator.username}
                            {stream.creator.isCreatorVerified && (
                              <span className="ml-1 text-cyan-400">✓</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Creators You Follow */}
          {hasFollowedCreators && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-xl font-bold text-white">Following</h2>
                </div>
                <Link
                  href="/subscriptions"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  See All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {data.followedCreators.map((creator) => (
                  <Link
                    key={creator.id}
                    href={creator.isLive ? `/live/${creator.id}` : `/${creator.username}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  >
                    <div className={`relative p-0.5 rounded-full ${
                      creator.isLive
                        ? 'bg-gradient-to-br from-red-500 to-orange-500'
                        : creator.isOnline
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                        : 'bg-white/20'
                    }`}>
                      <div className="p-0.5 bg-[#0a0a0f] rounded-full">
                        {creator.avatarUrl ? (
                          <Image
                            src={creator.avatarUrl}
                            alt={creator.displayName || creator.username}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                            {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Status Badge */}
                      {creator.isLive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-[10px] font-bold text-white rounded-sm">
                          LIVE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors truncate max-w-[72px]">
                      @{creator.username}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Discover Creators */}
          {hasDiscoverCreators && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Discover Creators</h2>
                </div>
                <Link
                  href="/explore"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  See All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {data.discoverCreators.map((creator) => (
                  <Link
                    key={creator.id}
                    href={`/${creator.username}`}
                    className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all text-center"
                  >
                    <div className="relative inline-block mb-3">
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.displayName || creator.username}
                          width={72}
                          height={72}
                          className="w-18 h-18 rounded-full object-cover mx-auto"
                        />
                      ) : (
                        <div className="w-18 h-18 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white mx-auto">
                          {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      {creator.isOnline && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#0a0a0f] rounded-full" />
                      )}
                    </div>
                    <h3 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                      {creator.displayName || creator.username}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      @{creator.username}
                      {creator.isCreatorVerified && (
                        <span className="ml-1 text-cyan-400">✓</span>
                      )}
                    </p>
                    {creator.primaryCategory && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-white/5 text-xs text-gray-400 rounded">
                        {creator.primaryCategory}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {!hasLiveStreams && !hasFollowedCreators && !hasDiscoverCreators && (
            <div className="text-center py-16">
              <Sparkles className="w-16 h-16 text-purple-400/40 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Welcome to Digis!</h2>
              <p className="text-gray-400 mb-6">Start by exploring creators and following your favorites.</p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform"
              >
                <Sparkles className="w-5 h-5" />
                Explore Creators
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Marketing Page Component (for logged-out users)
function MarketingPage({
  onLogin,
  onSignup,
}: {
  onLogin: () => void;
  onSignup: (redirectTo: string) => void;
}) {
  return (
    <div className="min-h-screen bg-black">
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
                onClick={onLogin}
                className="px-5 md:px-7 py-2.5 md:py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold text-sm md:text-base hover:bg-white/20 hover:scale-105 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => onSignup('/explore')}
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
                onClick={() => onSignup('/explore')}
                className="px-10 py-4 rounded-full bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white font-bold text-lg hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all duration-300"
              >
                Start Exploring
              </button>
              <button
                onClick={() => onSignup('/creator/apply')}
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

// Main Page Component
export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupRedirectTo, setSignupRedirectTo] = useState('/');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Fetch user role
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            const role = data.user?.role;
            setUserRole(role);

            // Redirect creators and admins to their dashboards
            if (role === 'admin') {
              router.replace('/admin');
              return;
            } else if (role === 'creator') {
              router.replace('/creator/dashboard');
              return;
            }

            // Fans stay on homepage and see the dashboard
            setIsAuthenticated(true);
            setLoading(false);
          } else {
            setIsAuthenticated(true);
            setLoading(false);
          }
        } catch {
          setIsAuthenticated(true);
          setLoading(false);
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

  // Authenticated fans see the dashboard
  if (isAuthenticated) {
    return <FanDashboard />;
  }

  // Non-authenticated users see the marketing page
  return (
    <>
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

      <MarketingPage
        onLogin={() => setShowLogin(true)}
        onSignup={(redirectTo) => {
          setSignupRedirectTo(redirectTo);
          setShowSignup(true);
        }}
      />
    </>
  );
}
