'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isCreatorVerified: boolean;
  followerCount: number;
};

export default function FollowersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch both followers and following
      const [followersRes, followingRes] = await Promise.all([
        fetch('/api/user/followers'),
        fetch('/api/user/following'),
      ]);

      if (!followersRes.ok || !followingRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const followersData = await followersRes.json();
      const followingData = await followingRes.json();

      setFollowers(followersData.followers || []);
      setFollowing(followingData.following || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const renderUserCard = (user: User) => (
    <div
      key={user.id}
      onClick={() => router.push(`/${user.username}`)}
      className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 hover:border-digis-cyan/50 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/10"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-purple flex items-center justify-center text-2xl font-bold text-white border-2 border-white/10">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
          )}
          {user.isCreatorVerified && (
            <div className="absolute -bottom-1 -right-1 bg-digis-cyan rounded-full p-1">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white truncate">
              {user.displayName || user.username}
            </h3>
          </div>
          <p className="text-sm text-gray-400">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-gray-300 mt-1 line-clamp-2">{user.bio}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {user.followerCount} {user.followerCount === 1 ? 'follower' : 'followers'}
          </p>
        </div>

        {/* Arrow */}
        <div className="text-gray-500 group-hover:text-digis-cyan transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Community</h1>
            <p className="text-gray-400">
              {followers.length} {followers.length === 1 ? 'follower' : 'followers'} · {following.length} following
            </p>
          </div>
          <GlassButton
            variant="ghost"
            onClick={() => router.back()}
          >
            ← Back
          </GlassButton>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('followers')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'followers'
                ? 'text-digis-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Followers ({followers.length})
            {activeTab === 'followers' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-digis-cyan" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`pb-4 px-2 font-semibold transition-colors relative ${
              activeTab === 'following'
                ? 'text-digis-cyan'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Following ({following.length})
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-digis-cyan" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="space-y-3">
          {activeTab === 'followers' ? (
            followers.length > 0 ? (
              followers.map(renderUserCard)
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-white mb-2">No followers yet</h3>
                <p className="text-gray-400 mb-6">
                  Share your profile to grow your community
                </p>
                <GlassButton
                  variant="gradient"
                  onClick={() => router.push('/creator/dashboard')}
                  shimmer
                  glow
                >
                  Back to Dashboard
                </GlassButton>
              </div>
            )
          ) : (
            following.length > 0 ? (
              following.map(renderUserCard)
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2">Not following anyone yet</h3>
                <p className="text-gray-400 mb-6">
                  Discover and follow other creators
                </p>
                <GlassButton
                  variant="gradient"
                  onClick={() => router.push('/explore')}
                  shimmer
                  glow
                >
                  Explore Creators
                </GlassButton>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
