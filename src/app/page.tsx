'use client';

import { useState, useEffect, useRef, memo } from 'react';
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
  Sparkles,
  ChevronRight,
  Radio,
  Eye,
  Search,
  UserCircle,
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
  liveStreamId?: string | null;
  primaryCategory?: string | null;
  followerCount?: number;
  createdAt?: string;
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
}

// Filters for discover section
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'online', label: 'Online' },
  { key: 'new', label: 'New' },
];

// Fan Dashboard Component
function FanDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<HomepageData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Explore/Discover state
  const [creators, setCreators] = useState<Creator[]>([]);
  const [liveCreators, setLiveCreators] = useState<Creator[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch dashboard data (Live streams, Following)
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/fan/homepage');
        if (res.ok) {
          const json = await res.json();
          setDashboardData(json);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch creators when filter changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setCreators([]);
    fetchCreators(0, true);
  }, [selectedFilter]);

  // Debounced search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setOffset(0);
      setHasMore(true);
      setCreators([]);
      fetchCreators(0, true);
    }, 400);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !creatorsLoading && !loadingMore && !searching) {
          loadMoreCreators();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, creatorsLoading, loadingMore, searching, offset]);

  const loadMoreCreators = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchCreators(offset + 50, false);
  };

  const fetchCreators = async (pageOffset: number = 0, isReset: boolean = false) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const params = new URLSearchParams({
        offset: pageOffset.toString(),
        limit: '50',
      });

      if (searchTerm) params.set('search', searchTerm);
      if (selectedFilter && selectedFilter !== 'all') {
        params.set('filter', selectedFilter);
      }

      const response = await fetch(`/api/explore?${params}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const result = await response.json();

      if (response.ok && result.data) {
        const allCreators = result.data.creators || [];

        if (isReset) {
          const live = allCreators.filter((c: Creator) => c.isLive);
          const notLive = selectedFilter === 'live' ? [] : allCreators.filter((c: Creator) => !c.isLive);
          setLiveCreators(live);
          setCreators(notLive);
        } else {
          setCreators(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCreators = allCreators.filter((c: Creator) => !existingIds.has(c.id));
            return [...prev, ...newCreators];
          });
        }

        setHasMore(result.data.pagination?.hasMore ?? false);
        setOffset(pageOffset);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name !== 'AbortError') {
        console.error('Error fetching creators:', error);
      }
    } finally {
      setCreatorsLoading(false);
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const hasLiveStreams = dashboardData && dashboardData.liveStreams.length > 0;
  const hasFollowedCreators = dashboardData && dashboardData.followedCreators.length > 0;

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
                    {dashboardData!.liveStreams.length}
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
                {dashboardData!.liveStreams.slice(0, 6).map((stream) => (
                  <Link
                    key={stream.id}
                    href={`/live/${stream.id}`}
                    className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/50 transition-all hover:scale-[1.02]"
                  >
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
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded-md">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-white">LIVE</span>
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded-md text-xs text-white">
                        <Eye className="w-3 h-3" />
                        {stream.currentViewers}
                      </div>
                    </div>
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
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {dashboardData!.followedCreators.map((creator) => (
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
                      {creator.isLive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-[10px] font-bold text-white rounded-sm">
                          LIVE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-white transition-colors truncate max-w-[72px]">
                      {creator.username}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Discover Creators Section (Full Explore) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Discover Creators</h2>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSearching(true);
                  }}
                  placeholder="Search creators..."
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key)}
                  className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedFilter === filter.key
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Live Creators Section */}
            {liveCreators.length > 0 && selectedFilter !== 'live' && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="relative">
                    <Radio className="w-5 h-5 text-red-500" />
                    <div className="absolute inset-0 w-5 h-5 text-red-500 animate-ping opacity-50">
                      <Radio className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white">Live Creators</h3>
                  <span className="text-sm text-gray-400">({liveCreators.length})</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {liveCreators.map((creator) => (
                    <LiveCreatorCard
                      key={creator.id}
                      creator={creator}
                      onClick={() => router.push(creator.liveStreamId ? `/live/${creator.liveStreamId}` : `/${creator.username}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Creators Grid */}
            {creatorsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {[...Array(10)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : creators.length === 0 && liveCreators.length === 0 ? (
              <div className="py-16 text-center">
                <UserCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchTerm ? 'No results found' : 'No creators found'}
                </h3>
                <p className="text-gray-400">
                  {searchTerm ? 'Try a different search term' : 'Check back later for new creators'}
                </p>
              </div>
            ) : (
              <>
                {liveCreators.length > 0 && selectedFilter !== 'live' && creators.length > 0 && (
                  <h3 className="text-lg font-bold text-white mb-4">All Creators</h3>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {(selectedFilter === 'live' ? liveCreators : creators).map((creator) => (
                    <CreatorCard
                      key={creator.id}
                      creator={creator}
                      onClick={() => router.push(creator.isLive && creator.liveStreamId ? `/live/${creator.liveStreamId}` : `/${creator.username}`)}
                    />
                  ))}
                </div>

                {/* Load more trigger */}
                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-gray-400 text-sm">Loading more...</span>
                    </div>
                  )}
                  {!hasMore && creators.length > 0 && (
                    <p className="text-gray-500 text-sm">You've seen all creators</p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// Skeleton Card
function SkeletonCard() {
  return (
    <div className="bg-white/5 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-white/10" />
      <div className="p-3">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

// Live Creator Card
function LiveCreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-500/50 hover:border-red-500 transition-all"
    >
      <div className="absolute top-2 left-2 z-10 px-2.5 py-1 bg-red-500 rounded-full">
        <span className="text-xs font-bold text-white">LIVE</span>
      </div>

      <div className="relative overflow-hidden" style={{ paddingBottom: '100%' }}>
        {creator.avatarUrl ? (
          <img
            src={creator.avatarUrl}
            alt={creator.username}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
            <UserCircle className="w-16 h-16 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-bold text-white truncate">{creator.username}</p>
      </div>
    </div>
  );
}

// Creator Card
const CreatorCard = memo(function CreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all"
      onClick={onClick}
    >
      <div className="relative overflow-hidden" style={{ paddingBottom: '100%' }}>
        {creator.avatarUrl ? (
          <img
            src={creator.avatarUrl}
            alt={creator.username}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-gray-500" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {creator.isLive && (
            <span className="px-2.5 py-0.5 bg-red-500 rounded-full text-xs font-bold text-white">
              LIVE
            </span>
          )}
          {creator.isOnline && !creator.isLive && (
            <span className="px-2 py-0.5 bg-green-500/80 rounded-full text-xs font-medium text-white">
              Online
            </span>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1">
          <p className="font-semibold text-white truncate">{creator.username}</p>
          {creator.isCreatorVerified && (
            <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        {creator.createdAt && (() => {
          const daysSinceJoined = Math.floor((Date.now() - new Date(creator.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceJoined <= 30 ? (
            <div className="flex items-center gap-1 text-xs text-amber-400 mt-1">
              <Sparkles className="w-3 h-3" />
              <span>New Creator</span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
});

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
                onClick={() => onSignup('/')}
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={() => onSignup('/')}
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        try {
          const response = await fetch('/api/user/profile');
          if (response.ok) {
            const data = await response.json();
            const role = data.user?.role;

            if (role === 'admin') {
              router.replace('/admin');
              return;
            } else if (role === 'creator') {
              router.replace('/creator/dashboard');
              return;
            }

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

  if (isAuthenticated) {
    return <FanDashboard />;
  }

  return (
    <>
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
