'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, LoadingSpinner } from '@/components/ui';
import { Search, UserCircle, Verified, Users } from 'lucide-react';

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

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await fetch(`/api/explore?search=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      if (response.ok) {
        setCreators(data.creators);
      }
    } catch (error) {
      console.error('Error searching creators:', error);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-digis-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            Explore Creators
          </h1>
          <p className="text-gray-400">
            Discover and follow your favorite creators
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <GlassCard className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search creators by name, username, or bio..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-digis-cyan transition-colors"
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
            <h3 className="text-xl font-semibold mb-2">No creators found</h3>
            <p className="text-gray-400">
              {searchTerm ? 'Try a different search term' : 'Check back soon for new creators!'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => router.push(`/profile/${creator.username}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CreatorCardProps {
  creator: Creator;
  onClick: () => void;
}

function CreatorCard({ creator, onClick }: CreatorCardProps) {
  return (
    <GlassCard
      className="overflow-hidden cursor-pointer transition-all hover:scale-105 hover:border-digis-cyan"
      onClick={onClick}
    >
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20">
        {creator.bannerUrl ? (
          <img
            src={creator.bannerUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-digis-cyan/10 to-digis-pink/10" />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Avatar */}
        <div className="relative -mt-12 mb-4">
          <div className="relative inline-block">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName || creator.username}
                className="w-20 h-20 rounded-full border-4 border-digis-dark object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-digis-dark bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-white" />
              </div>
            )}
            {creator.isOnline && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-digis-dark" />
            )}
          </div>
        </div>

        {/* Name and Verification */}
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold truncate">
              {creator.displayName || creator.username}
            </h3>
            {creator.isCreatorVerified && (
              <Verified className="w-5 h-5 text-digis-cyan fill-digis-cyan flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">@{creator.username}</p>
        </div>

        {/* Bio */}
        {creator.bio && (
          <p className="text-sm text-gray-300 mb-3 line-clamp-2">
            {creator.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>
            <strong className="text-white">{creator.followerCount}</strong> followers
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
