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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, [selectedCategory]);

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
    <div className="min-h-screen bg-pastel-gradient">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Wallet Widget */}
        <MobileWalletWidget />

        <div className="px-4 pt-0 md:pt-4 pb-20 md:pb-8">
        {/* Category Pills */}
        {!searchTerm && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Featured Creators</h2>
            </div>
            <CategoryPills
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        )}

        {/* Featured Carousel */}
        {!searchTerm && featuredCreators.length > 0 && (
          <div className="mb-8">
            <CreatorCarousel creators={featuredCreators} autoPlay={true} interval={5000} />
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <GlassCard className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search creators by name, username, or bio..."
                className="w-full pl-12 pr-4 py-3 bg-white/50 border border-purple-200 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:border-digis-cyan transition-colors"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Browse All Section Header */}
        {!searchTerm && (
          <div className="mb-4">
            <h3 className="text-lg md:text-xl font-bold text-gray-800">
              {selectedCategory === 'All' ? 'All Creators' : `${selectedCategory} Creators`}
            </h3>
          </div>
        )}

        {/* Creators Grid */}
        {creators.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No creators found</h3>
            <p className="text-gray-700">
              {searchTerm ? 'Try a different search term' : 'Check back soon for new creators!'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
    <GlassCard
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-digis-cyan/60 group relative"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 16:9 Creator Card Image */}
      <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
        {cardImageUrl ? (
          <>
            <img
              src={cardImageUrl}
              alt={`${creator.displayName || creator.username}`}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
          <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md animate-pulse" />
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300">
            <span className="text-white font-semibold text-sm md:text-base">View Profile</span>
          </div>
        )}
      </div>

      {/* Creator Name */}
      <div className="p-2 md:p-3">
        <div className="flex items-center justify-center gap-1">
          <h3 className="text-sm md:text-base font-bold text-gray-800 truncate text-center">
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
    </GlassCard>
  );
}
