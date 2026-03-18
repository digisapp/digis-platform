'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAblyClient } from '@/lib/ably/client';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { LoadingSpinner } from '@/components/ui';
import {
  Play, ChevronRight, Radio, Search,
  UserCircle, BadgeCheck, X,
} from 'lucide-react';
import { CreatorCard, SkeletonCard } from './CreatorCards';
import type { Creator, HomepageData } from './types';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'online', label: 'Online' },
  { key: 'new', label: 'New' },
];

export function FanDashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<HomepageData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Explore/Discover state
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [creatorsLoading, setCreatorsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time live stream updates
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getAblyClient>['channels']['get']> | null = null;

    try {
      const ably = getAblyClient();
      channel = ably.channels.get('platform:live');
      channel.subscribe('stream_started', () => fetchDashboard());
      channel.subscribe('stream_ended', () => fetchDashboard());
    } catch {
      console.debug('[Home] Ably not available, using polling only');
    }

    return () => { if (channel) channel.unsubscribe(); };
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
          setCreators(allCreators);
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
      <div className="md:hidden pt-safe-area" style={{ height: '64px', paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      <main className="pb-24 md:pt-6 md:pb-8 md:pl-20">
        <div className="max-w-7xl mx-auto px-4 pb-4 md:py-4">
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
                  href="/streams"
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
                              <BadgeCheck className="inline w-3.5 h-3.5 ml-1 text-cyan-400" />
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
            <section className="mb-4">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {dashboardData!.followedCreators.map((creator) => (
                  <Link
                    key={creator.id}
                    href={creator.isLive && creator.liveStreamId ? `/live/${creator.liveStreamId}` : `/${creator.username}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  >
                    <div className={`relative p-0.5 rounded-full ${
                      creator.isLive
                        ? 'bg-gradient-to-br from-red-500 to-orange-500 animate-breathe'
                        : creator.isOnline
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                        : 'bg-white/20'
                    }`}>
                      <div className="p-0.5 bg-[#0a0a0f] rounded-full">
                        {creator.avatarUrl ? (
                          <Image
                            src={creator.avatarUrl}
                            alt={creator.displayName || creator.username}
                            width={96}
                            height={96}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xl md:text-2xl font-bold text-white">
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
                    <span className="text-xs md:text-sm text-gray-400 group-hover:text-white transition-colors truncate max-w-[72px] md:max-w-[88px]">
                      {creator.username}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Discover Creators Section */}
          <section>
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
                  className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                {searchTerm ? (
                  <button
                    onClick={() => { setSearchTerm(''); setSearching(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                ) : searching ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : null}
              </div>
            </div>

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

            {creatorsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : creators.length === 0 ? (
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {creators.map((creator) => (
                    <CreatorCard
                      key={creator.id}
                      creator={creator}
                      onClick={() => router.push(creator.isLive && creator.liveStreamId ? `/live/${creator.liveStreamId}` : `/${creator.username}`)}
                    />
                  ))}
                </div>

                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {loadingMore && <LoadingSpinner size="sm" />}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
