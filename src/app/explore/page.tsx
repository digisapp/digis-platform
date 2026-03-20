'use client';

import { useEffect, useState, memo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useLanguage } from '@/context/LanguageContext';
import { Search, UserCircle, Radio, Sparkles, BadgeCheck, X } from 'lucide-react';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  primaryCategory: string | null;
  isCreatorVerified: boolean;
  followerCount: number;
  isOnline: boolean;
  isFollowing: boolean;
  isLive?: boolean;
  liveStreamId?: string | null;
  createdAt?: string;
}

export default function ExplorePage() {
  const router = useRouter();
  const { t } = useLanguage();

  const translatedFilters = [
    { key: 'all', label: t.dashboard.all },
    { key: 'live', label: t.dashboard.live },
    { key: 'online', label: t.dashboard.online },
    { key: 'new', label: t.dashboard.new },
  ];
  const [creators, setCreators] = useState<Creator[]>([]);
  const [liveCreators, setLiveCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setCreators([]);
    fetchCreators(0, true);
  }, [selectedFilter, selectedCategory]);

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
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !searching) {
          loadMoreCreators();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore, searching, offset]);

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

        // Store categories from API
        if (result.data.categories && isReset) {
          setCategories(result.data.categories);
        }

        // Filter by category client-side
        const filtered = selectedCategory && selectedCategory !== 'All'
          ? allCreators.filter((c: Creator) => c.primaryCategory === selectedCategory)
          : allCreators;

        if (isReset) {
          const live = filtered.filter((c: Creator) => c.isLive);
          const notLive = selectedFilter === 'live' ? [] : filtered.filter((c: Creator) => !c.isLive);
          setLiveCreators(live);
          setCreators(notLive);
        } else {
          setCreators(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCreators = filtered.filter((c: Creator) => !existingIds.has(c.id));
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
      setLoading(false);
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearching(false);
  }, []);

  const SkeletonCard = () => (
    <div className="rounded-2xl overflow-hidden animate-pulse bg-white/5">
      <div className="aspect-[3/4] bg-white/10" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/8 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-7xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
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
                placeholder={t.dashboard.searchCreators}
                className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              {searchTerm ? (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Clear search"
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

          {/* Filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {translatedFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-4 py-2 min-h-[40px] rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedFilter === filter.key
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          {categories.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Live Now Section */}
          {liveCreators.length > 0 && selectedFilter !== 'live' && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <Radio className="w-5 h-5 text-red-500" />
                  <div className="absolute inset-0 w-5 h-5 text-red-500 animate-ping opacity-50">
                    <Radio className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-white">{t.dashboard.liveNow}</h2>
                <span className="text-sm text-gray-400">({liveCreators.length})</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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

          {/* Main Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : creators.length === 0 && liveCreators.length === 0 ? (
            <div className="py-20 text-center">
              <UserCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? t.common.noResults : t.dashboard.noCreators}
              </h3>
              <p className="text-gray-400 text-sm">
                {searchTerm ? t.dashboard.tryDifferentSearch : t.dashboard.checkBackSoon}
              </p>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-4 px-5 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  {t.common.clearSearch}
                </button>
              )}
            </div>
          ) : (
            <>
              {liveCreators.length > 0 && selectedFilter !== 'live' && creators.length > 0 && (
                <h2 className="text-lg font-bold text-white mb-4">{t.dashboard.discoverCreators}</h2>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(selectedFilter === 'live' ? liveCreators : creators).map((creator) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    onClick={() => router.push(creator.isLive && creator.liveStreamId ? `/live/${creator.liveStreamId}` : `/${creator.username}`)}
                  />
                ))}
              </div>

              <div ref={loadMoreRef} className="py-8 flex justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-gray-400 text-sm">{t.common.loadingMore}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Live Creator Card — prominent with red border + pulse
const LiveCreatorCard = memo(function LiveCreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const { t } = useLanguage();

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-500/50 hover:border-red-500 transition-all"
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-red-500 rounded-full">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-xs font-bold text-white">{t.common.live}</span>
      </div>

      <div className="relative aspect-[3/4] overflow-hidden">
        {creator.avatarUrl && !imgError ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.username}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
            <UserCircle className="w-16 h-16 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-white truncate">{creator.displayName || creator.username}</p>
          {creator.isCreatorVerified && (
            <BadgeCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
});

// Regular Creator Card — portrait, clean design
const CreatorCard = memo(function CreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const { t } = useLanguage();

  const isNew = creator.createdAt &&
    Math.floor((Date.now() - new Date(creator.createdAt).getTime()) / (1000 * 60 * 60 * 24)) <= 30;

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all"
      onClick={onClick}
    >
      {/* Portrait image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {creator.avatarUrl && !imgError ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.username}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-gray-500" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {creator.isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {t.common.live}
            </span>
          )}
          {creator.isOnline && !creator.isLive && (
            <span className="px-2 py-0.5 bg-green-500/80 rounded-full text-xs font-medium text-white">
              {t.dashboard.online}
            </span>
          )}
          {isNew && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/80 rounded-full text-xs font-medium text-white">
              <Sparkles className="w-3 h-3" />
              {t.dashboard.new}
            </span>
          )}
        </div>

        {/* Category badge */}
        {creator.primaryCategory && (
          <div className="absolute top-2 right-2 z-10">
            <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full text-[10px] font-medium text-gray-300">
              {creator.primaryCategory}
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-white truncate text-sm">
            {creator.displayName || creator.username}
          </p>
          {creator.isCreatorVerified && (
            <BadgeCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          )}
        </div>

      </div>
    </div>
  );
});
