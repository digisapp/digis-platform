'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { MobileWalletWidget } from '@/components/ui/MobileWalletWidget';
import { Search, UserCircle, Verified, Users, Phone, MessageCircle, UserCheck, UserPlus } from 'lucide-react';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  isCreatorVerified: boolean;
  followerCount: number;
  isOnline: boolean;
  isFollowing: boolean;
}

export default function ExplorePage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, []);

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
      const response = await fetch('/api/explore');
      const result = await response.json();

      if (response.ok && result.data) {
        setCreators(result.data.creators || []);
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

  const handleFollowToggle = async (creatorId: string, currentlyFollowing: boolean) => {
    try {
      const method = currentlyFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/follow/${creatorId}`, { method });

      if (response.ok) {
        // Update local state
        setCreators(prev => prev.map(creator =>
          creator.id === creatorId
            ? {
                ...creator,
                isFollowing: !currentlyFollowing,
                followerCount: currentlyFollowing
                  ? Math.max(0, creator.followerCount - 1)
                  : creator.followerCount + 1
              }
            : creator
        ));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await fetch(`/api/explore?search=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();

      if (response.ok && result.data) {
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
      <div className="min-h-screen bg-pastel-gradient">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Wallet Widget Skeleton */}
          <div className="md:hidden mb-4 px-4 pt-4">
            <div className="glass rounded-2xl border-2 border-purple-200 p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-gray-300 rounded"></div>
                <div className="h-5 w-16 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>

          <div className="px-4">
            {/* Search Bar Skeleton */}
            <div className="mb-8">
              <GlassCard className="p-4">
                <div className="h-12 bg-gray-200 animate-pulse rounded-lg" />
              </GlassCard>
            </div>

            {/* Loading Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CreatorCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Wallet Widget */}
        <MobileWalletWidget />

        <div className="px-4 pt-0 md:pt-4 pb-20 md:pb-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => router.push(`/${creator.username}`)}
                onFollowToggle={handleFollowToggle}
                router={router}
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
  onFollowToggle: (creatorId: string, currentlyFollowing: boolean) => void;
  router: ReturnType<typeof useRouter>;
}

// Loading skeleton component
function CreatorCardSkeleton() {
  return (
    <GlassCard className="overflow-hidden">
      {/* Banner Skeleton */}
      <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />

      {/* Content Skeleton */}
      <div className="p-5">
        {/* Avatar Skeleton */}
        <div className="relative -mt-16 mb-4">
          <div className="w-24 h-24 rounded-full bg-gray-300 animate-pulse border-4 border-white" />
        </div>

        {/* Name Skeleton */}
        <div className="mb-2 space-y-2">
          <div className="h-6 bg-gray-300 animate-pulse rounded w-3/4" />
          <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
        </div>

        {/* Bio Skeleton */}
        <div className="mb-3 space-y-2">
          <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
          <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6" />
        </div>

        {/* Stats Skeleton */}
        <div className="h-4 bg-gray-200 animate-pulse rounded w-2/5 mb-4" />

        {/* Buttons Skeleton */}
        <div className="space-y-2">
          <div className="h-10 bg-gray-300 animate-pulse rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-10 bg-gray-200 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function CreatorCard({ creator, onClick, onFollowToggle, router }: CreatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFollowLoading(true);
    await onFollowToggle(creator.id, creator.isFollowing);
    setIsFollowLoading(false);
  };

  return (
    <GlassCard
      className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-digis-cyan/60 group relative"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 overflow-hidden">
        {creator.bannerUrl ? (
          <>
            <img
              src={creator.bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {/* Gradient overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-digis-cyan/10 to-digis-pink/10" />
        )}

        {/* View Profile Overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300">
            <span className="text-white font-semibold text-lg">View Profile</span>
          </div>
        )}

        {/* Following Badge */}
        {creator.isFollowing && (
          <div className="absolute top-3 right-3 bg-digis-cyan text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
            <UserCheck className="w-3 h-3" />
            Following
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Avatar */}
        <div className="relative -mt-16 mb-4">
          <div className="relative inline-block">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={`${creator.displayName || creator.username}'s avatar`}
                className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                <UserCircle className="w-14 h-14 text-white" />
              </div>
            )}
            {creator.isOnline && (
              <div
                className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-md animate-pulse"
                aria-label="Online"
              />
            )}
          </div>
        </div>

        {/* Name and Verification */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold truncate text-gray-800">
              {creator.displayName || creator.username}
            </h3>
            {creator.isCreatorVerified && (
              <Verified
                className="w-5 h-5 text-digis-cyan fill-digis-cyan flex-shrink-0"
                aria-label="Verified creator"
              />
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">@{creator.username}</p>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2 min-h-[2.5rem]">
            {creator.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
          <Users className="w-4 h-4" />
          <span>
            <strong className="text-gray-900">{creator.followerCount.toLocaleString()}</strong> followers
          </span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Follow Button */}
          <button
            onClick={handleFollowClick}
            disabled={isFollowLoading}
            className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              creator.isFollowing
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                : 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white hover:shadow-lg hover:scale-105'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={creator.isFollowing ? 'Unfollow creator' : 'Follow creator'}
          >
            {isFollowLoading ? (
              <LoadingSpinner size="sm" />
            ) : creator.isFollowing ? (
              <>
                <UserCheck className="w-4 h-4" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Follow
              </>
            )}
          </button>

          {/* Message and Video Call Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/messages?user=${creator.username}`);
              }}
              className="px-3 py-2 bg-white border-2 border-digis-purple text-digis-purple rounded-lg font-semibold hover:bg-digis-purple hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="Send message to creator"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/calls/request/${creator.id}`);
              }}
              className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="Request video call with creator"
            >
              <Phone className="w-4 h-4" />
              Call
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
