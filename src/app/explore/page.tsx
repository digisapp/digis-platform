'use client';

import { useEffect, useState, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { CreatorCarousel } from '@/components/explore/CreatorCarousel';
import { CategoryPills } from '@/components/explore/CategoryPills';
import { AnimatedGradientBorder } from '@/components/animations/AnimatedGradientBorder';
import { NeonLoader, NeonSkeleton } from '@/components/ui/NeonLoader';
import { Search, UserCircle, UserPlus, TrendingUp } from 'lucide-react';

interface FeaturedCreator {
  id: string;
  username: string;
  displayName: string | null;
  creatorCardImageUrl: string | null;
  isCreatorVerified: boolean;
  isOnline: boolean;
  isTrending: boolean;
  followerCount: number;
}

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  creatorCardImageUrl: string | null;
  bio: string | null;
  isCreatorVerified: boolean;
  isTrending: boolean;
  followerCount: number;
  isOnline: boolean;
  isFollowing: boolean;
  primaryCategory?: string | null;
}

export default function ExplorePage() {
  const router = useRouter();
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  // Special filter options
  const specialFilters = ['Online', 'New', 'Trending', 'Available for Calls', 'Live Now'];

  useEffect(() => {
    fetchCreators();
  }, [selectedCategory, selectedFilter]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm !== '') {
        handleSearch();
      } else {
        fetchCreators();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  const fetchCreators = async () => {
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
      });

      // Add filter parameter if a special filter is selected
      if (selectedFilter) {
        params.set('filter', selectedFilter.toLowerCase().replace(/\s+/g, '_'));
      }

      const response = await fetch(`/api/explore?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setFeaturedCreators(result.data.featuredCreators || []);
        setCreators(result.data.creators || []);
        setCategories(result.data.categories || ['All']);
        if (result.degraded) {
          console.warn('Creators data degraded:', result.error);
        }
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        category: selectedCategory,
      });

      const response = await fetch(`/api/explore?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setFeaturedCreators(result.data.featuredCreators || []);
        setCreators(result.data.creators || []);
      }
    } catch (error) {
      console.error('Error searching creators:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = useCallback(async (creatorId: string, currentlyFollowing: boolean) => {
    try {
      const response = await fetch('/api/follows', {
        method: currentlyFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: creatorId }),
      });

      if (response.ok) {
        // Update the local state
        setCreators(prevCreators =>
          prevCreators.map(creator =>
            creator.id === creatorId
              ? { ...creator, isFollowing: !currentlyFollowing }
              : creator
          )
        );
      }
    } catch (error) {
      console.error('Error following/unfollowing creator:', error);
    }
  }, []);

  if (loading) {
    return (
      <NeonLoader
        size="xl"
        variant="logo"
        text="Loading creators..."
        fullScreen
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header with Logo */}
      <MobileHeader />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Spacer for fixed mobile header */}
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-2 md:pt-10 pb-24 md:pb-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search creators..."
              className="w-full pl-12 pr-12 py-3.5 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        {!searchTerm && (
          <div className="mb-5">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-1">
              {/* All Categories button - show first */}
              {categories.map((category) => {
                const isSelected = category === selectedCategory && !selectedFilter;
                return (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedFilter('');
                    }}
                    className={`
                      flex-shrink-0 px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30 hover:border-digis-cyan hover:bg-white hover:scale-105'
                      }
                    `}
                  >
                    {category}
                  </button>
                );
              })}

              {/* Special Filters */}
              {specialFilters.map((filter) => {
                const isSelected = filter === selectedFilter;
                return (
                  <button
                    key={filter}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedFilter('');
                      } else {
                        setSelectedFilter(filter);
                        setSelectedCategory('All');
                      }
                    }}
                    className={`
                      flex-shrink-0 px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30 hover:border-digis-cyan hover:bg-white hover:scale-105'
                      }
                    `}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
            <style jsx>{`
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
          </div>
        )}

        {/* Featured Carousel */}
        {!searchTerm && featuredCreators.length > 0 && (
          <div className="mb-6">
            <CreatorCarousel creators={featuredCreators} autoPlay={true} interval={5000} />
          </div>
        )}

        {/* Creators Grid */}
        {creators.length === 0 ? (
          <div className="p-16 text-center backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20">
            <Search className="w-20 h-20 text-gray-400 mx-auto mb-5" />
            <h3 className="text-2xl font-bold mb-2 text-white">No creators found</h3>
            <p className="text-gray-400 text-lg">
              {searchTerm ? 'Try a different search term' : 'Check back soon for new creators!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {creators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => router.push(`/${creator.username}`)}
                onFollow={handleFollow}
              />
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

interface CreatorCardProps {
  creator: Creator;
  onClick: () => void;
  onFollow: (creatorId: string, currentlyFollowing: boolean) => void;
}

// Loading skeleton component
function CreatorCardSkeleton() {
  return (
    <GlassCard className="overflow-hidden">
      {/* 16:9 Image Skeleton */}
      <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
      </div>

      {/* Name Skeleton */}
      <div className="p-3">
        <div className="h-5 bg-gray-300 animate-pulse rounded w-3/4 mx-auto" />
      </div>
    </GlassCard>
  );
}

const CreatorCard = memo(function CreatorCard({ creator, onClick, onFollow }: CreatorCardProps) {
  // Use creator card image first, fallback to banner, then gradient
  const cardImageUrl = creator.creatorCardImageUrl || creator.bannerUrl;
  const avatarUrl = creator.avatarUrl;

  return (
    <div
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] group relative rounded-2xl border border-white/20 hover:border-cyan-500/50"
      onClick={onClick}
    >
      {/* 4:5 Creator Card Image (Portrait - Instagram post style) with overlaid name */}
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ paddingBottom: '125%' }}>
        {cardImageUrl ? (
          <>
            <img
              src={cardImageUrl}
              alt={`${creator.displayName || creator.username}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            {/* Gradient overlay for better text contrast - stronger at bottom */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 flex items-center justify-center">
            <UserCircle className="w-16 h-16 md:w-20 md:h-20 text-gray-400" />
          </div>
        )}

        {/* Follow button - top right with glass futuristic style */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFollow(creator.id, creator.isFollowing);
          }}
          className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm border transition-all z-10 hover:scale-110 active:scale-95 ${
            creator.isFollowing
              ? 'bg-digis-cyan/30 border-digis-cyan/50 text-white hover:bg-digis-cyan/40'
              : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          }`}
          title={creator.isFollowing ? 'Unfollow' : 'Follow'}
        >
          <UserPlus className={`w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${creator.isFollowing ? 'fill-current' : ''}`} />
        </button>

        {/* Category badge - top left */}
        {creator.primaryCategory && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-semibold text-white border border-white/20">
            {creator.primaryCategory}
          </div>
        )}

        {/* Creator Name - Overlaid at bottom with minimal opacity to show image */}
        <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-sm bg-white/10 border-t border-white/20 group-hover:bg-white/20 transition-all duration-300">
          <div className="relative z-10">
            {/* Username with indicators */}
            <div className="flex items-center justify-center gap-1.5">
              {creator.isOnline && (
                <div className="relative flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-white" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                </div>
              )}
              <h3 className="text-sm md:text-base font-bold text-white truncate max-w-[140px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ letterSpacing: '-0.015em' }}>
                {creator.username}
              </h3>
              {creator.isTrending && (
                <div className="relative">
                  <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                  <div className="absolute -inset-1 bg-amber-400/20 rounded-full blur-sm animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Accent line on hover */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </div>
  );
});
