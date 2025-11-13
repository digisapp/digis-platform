'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { MobileWalletWidget } from '@/components/ui/MobileWalletWidget';
import { CreatorCarousel } from '@/components/explore/CreatorCarousel';
import { CategoryPills } from '@/components/explore/CategoryPills';
import { AnimatedGradientBorder } from '@/components/animations/AnimatedGradientBorder';
import { NeonLoader, NeonSkeleton } from '@/components/ui/NeonLoader';
import { Search, UserCircle, Verified } from 'lucide-react';

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
  const specialFilters = ['Online', 'New', 'Trending', 'Verified', 'Available for Calls', 'Live Now'];

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
    <div className="min-h-screen bg-pastel-gradient md:pl-20">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Wallet Widget */}
        <MobileWalletWidget />

        <div className="px-4 pt-0 md:pt-10 pb-20 md:pb-8">
        {/* Filter Pills and Category Pills */}
        {!searchTerm && (
          <>
            {/* Special Filters */}
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth pb-1">
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
                        }
                      }}
                      className={`
                        flex-shrink-0 px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200
                        ${
                          isSelected
                            ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white shadow-md scale-105'
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

            {/* Category Pills */}
            <div className="mb-5">
              <CategoryPills
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  // Clear filter when changing category
                  if (cat !== selectedCategory) {
                    setSelectedFilter('');
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Featured Carousel */}
        {!searchTerm && featuredCreators.length > 0 && (
          <div className="mb-6">
            <CreatorCarousel creators={featuredCreators} autoPlay={true} interval={5000} />
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search creators..."
              className="w-full pl-12 pr-12 py-3.5 bg-white/90 backdrop-blur-sm border-2 border-purple-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:bg-white transition-all shadow-sm"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Browse All Section Header */}
        {!searchTerm && (
          <div className="mb-5">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900">
              {selectedCategory === 'All' ? 'All Creators' : `${selectedCategory} Creators`}
            </h3>
          </div>
        )}

        {/* Creators Grid */}
        {creators.length === 0 ? (
          <div className="p-16 text-center bg-white/60 backdrop-blur-sm rounded-3xl border-2 border-purple-100">
            <Search className="w-20 h-20 text-gray-400 mx-auto mb-5" />
            <h3 className="text-2xl font-bold mb-2 text-gray-900">No creators found</h3>
            <p className="text-gray-600 text-lg">
              {searchTerm ? 'Try a different search term' : 'Check back soon for new creators!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {creators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => router.push(`/${creator.username}`)}
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

function CreatorCard({ creator, onClick }: CreatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Use creator card image first, fallback to banner, then gradient
  const cardImageUrl = creator.creatorCardImageUrl || creator.bannerUrl;

  return (
    <div
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl group relative bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-purple-200 hover:border-digis-cyan/70"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 4:5 Creator Card Image (Portrait) */}
      <div className="relative w-full" style={{ paddingBottom: '125%' }}>
        {cardImageUrl ? (
          <>
            <img
              src={cardImageUrl}
              alt={`${creator.displayName || creator.username}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            {/* Gradient overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 flex items-center justify-center">
            <UserCircle className="w-16 h-16 md:w-20 md:h-20 text-gray-400" />
          </div>
        )}

        {/* Online indicator */}
        {creator.isOnline && (
          <div className="absolute top-2.5 right-2.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent flex items-center justify-center transition-all duration-300">
            <span className="text-white font-bold text-sm md:text-base px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">View Profile</span>
          </div>
        )}
      </div>

      {/* Creator Name */}
      <div className="p-3 md:p-3.5">
        <div className="flex items-center justify-center gap-1.5">
          <h3 className="text-sm md:text-base font-bold text-gray-900 truncate text-center">
            {creator.displayName || creator.username}
          </h3>
          {creator.isCreatorVerified && (
            <Verified
              className="w-4 h-4 text-digis-cyan fill-digis-cyan flex-shrink-0"
              aria-label="Verified creator"
            />
          )}
        </div>
      </div>
    </div>
  );
}
