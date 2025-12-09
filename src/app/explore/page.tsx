'use client';

import { useEffect, useState, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { NeonLoader } from '@/components/ui/NeonLoader';
import { Search, UserCircle, Radio, Users } from 'lucide-react';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  creatorCardImageUrl?: string | null;
  bio: string | null;
  isCreatorVerified: boolean;
  isTrending: boolean;
  followerCount: number;
  isOnline: boolean;
  isFollowing: boolean;
  isLive?: boolean;
  primaryCategory?: string | null;
}

// Simple filters - removed complexity
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live', icon: '🔴' },
  { key: 'online', label: 'Online' },
  { key: 'new', label: 'New' },
];

export default function ExplorePage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [liveCreators, setLiveCreators] = useState<Creator[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
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
  }, [selectedFilter]);

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
    await fetchCreators(offset + 20, false);
  };

  const fetchCreators = async (pageOffset: number = 0, isReset: boolean = false) => {
    // Create abort controller with 8s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const params = new URLSearchParams({
        offset: pageOffset.toString(),
        limit: '20',
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
          // Separate live creators for the top section
          const live = allCreators.filter((c: Creator) => c.isLive);
          const notLive = selectedFilter === 'live' ? [] : allCreators;

          setLiveCreators(live);
          setCreators(notLive);
        } else {
          setCreators(prev => [...prev, ...allCreators]);
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

  // Skeleton card component for loading state
  const SkeletonCard = () => (
    <div className="bg-white/5 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-white/10" />
      <div className="p-3">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-7xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-2 md:pt-10 pb-24 md:pb-8">
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

          {/* Simple Filters */}
          <div className="flex gap-2 mb-6">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedFilter === filter.key
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {filter.icon && <span className="mr-1">{filter.icon}</span>}
                {filter.label}
              </button>
            ))}
          </div>

          {/* Live Now Section - Only show if there are live creators */}
          {liveCreators.length > 0 && selectedFilter !== 'live' && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                  <Radio className="w-5 h-5 text-red-500" />
                  <div className="absolute inset-0 w-5 h-5 text-red-500 animate-ping opacity-50">
                    <Radio className="w-5 h-5" />
                  </div>
                </div>
                <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white">Live Now</h2>
                <span className="text-sm text-gray-400">({liveCreators.length})</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {liveCreators.map((creator) => (
                  <LiveCreatorCard
                    key={creator.id}
                    creator={creator}
                    onClick={() => router.push(`/${creator.username}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Creators Grid */}
          {loading ? (
            // Show skeleton grid while loading
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {[...Array(10)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : creators.length === 0 && liveCreators.length === 0 ? (
            <div className="py-16 text-center">
              <UserCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No creators found</h3>
              <p className="text-gray-400">
                {searchTerm ? 'Try a different search' : 'Check back soon!'}
              </p>
            </div>
          ) : (
            <>
              {/* Section header for non-live creators */}
              {liveCreators.length > 0 && selectedFilter !== 'live' && creators.length > 0 && (
                <h2 className="text-lg font-bold text-white mb-4">Discover Creators</h2>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {(selectedFilter === 'live' ? liveCreators : creators).map((creator) => (
                  <CreatorCard
                    key={creator.id}
                    creator={creator}
                    onClick={() => router.push(`/${creator.username}`)}
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
        </div>
      </div>
    </div>
  );
}

// Live Creator Card - Larger, more prominent
function LiveCreatorCard({ creator, onClick }: { creator: Creator; onClick: () => void }) {
  const imageUrl = creator.creatorCardImageUrl || creator.avatarUrl;

  return (
    <div
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-500/50 hover:border-red-500 transition-all"
    >
      {/* Live badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 bg-red-500 rounded-full">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-xs font-bold text-white">LIVE</span>
      </div>

      {/* Image */}
      <div className="relative" style={{ paddingBottom: '100%' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
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

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-bold text-white truncate">{creator.displayName || creator.username}</p>
        <p className="text-sm text-gray-300">@{creator.username}</p>
      </div>
    </div>
  );
}

// Regular Creator Card - Clean minimal design
interface CreatorCardProps {
  creator: Creator;
  onClick: () => void;
}

const CreatorCard = memo(function CreatorCard({ creator, onClick }: CreatorCardProps) {
  const imageUrl = creator.creatorCardImageUrl || creator.avatarUrl;

  // Format follower count
  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all"
      onClick={onClick}
    >
      {/* Image section */}
      <div className="relative" style={{ paddingBottom: '100%' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={creator.username}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-gray-500" />
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {creator.isLive && (
            <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {creator.isOnline && !creator.isLive && (
            <span className="px-2 py-0.5 bg-green-500/80 rounded-full text-xs font-medium text-white">
              Online
            </span>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Info section */}
      <div className="p-3">
        {/* Username with verified badge */}
        <div className="flex items-center gap-1">
          <p className="font-semibold text-white truncate">
            {creator.displayName || creator.username}
          </p>
          {creator.isCreatorVerified && (
            <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Follower count */}
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
          <Users className="w-3 h-3" />
          <span>{formatFollowers(creator.followerCount)} followers</span>
        </div>
      </div>
    </div>
  );
});
