'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { MobileWalletWidget } from '@/components/ui/MobileWalletWidget';
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

  const handleFollow = async (creatorId: string, currentlyFollowing: boolean) => {
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
  };

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 md:pl-20 relative overflow-hidden">
      {/* Removed animated background mesh - cleaner light mode */}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Mobile Wallet Widget */}
        <MobileWalletWidget />

        <div className="px-4 pt-0 md:pt-10 pb-20 md:pb-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search creators..."
              className="w-full pl-12 pr-12 py-3.5 bg-white/60 backdrop-blur-xl border border-purple-200 rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-all"
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
                          ? 'bg-digis-cyan text-white shadow-lg shadow-cyan-500/50 border border-digis-cyan'
                          : 'bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:border-digis-cyan hover:bg-white hover:scale-105'
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
                          ? 'bg-digis-cyan text-white shadow-lg shadow-cyan-500/50 border border-digis-cyan'
                          : 'bg-white/90 backdrop-blur-sm border border-purple-200 text-gray-700 hover:border-digis-cyan hover:bg-white hover:scale-105'
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
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-3">
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

function CreatorCard({ creator, onClick, onFollow }: CreatorCardProps) {
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

        {/* Follow button - top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFollow(creator.id, creator.isFollowing);
          }}
          className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm transition-all z-10 hover:scale-110 active:scale-95 ${
            creator.isFollowing
              ? 'bg-digis-cyan text-white hover:bg-digis-cyan/90'
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
          title={creator.isFollowing ? 'Unfollow' : 'Follow'}
        >
          <UserPlus className={`w-4 h-4 ${creator.isFollowing ? 'fill-current' : ''}`} />
        </button>

        {/* Category badge - top left */}
        {creator.primaryCategory && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-semibold text-white border border-white/20">
            {creator.primaryCategory}
          </div>
        )}

        {/* Creator Name - Overlaid at bottom with glass effect */}
        <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-md bg-black/20 border-t border-white/10">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            {/* Username with indicators */}
            <div className="flex items-center justify-center gap-1.5">
              {creator.isOnline && (
                <div className="relative flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                </div>
              )}
              <h3 className="text-sm md:text-base font-bold text-white truncate max-w-[140px] drop-shadow-lg">
                {creator.username}
              </h3>
              {creator.isTrending && (
                <div className="relative">
                  <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="absolute -inset-1 bg-amber-400/30 rounded-full blur-sm animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
