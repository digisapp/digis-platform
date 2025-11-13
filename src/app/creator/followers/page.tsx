'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, UserPlus, BadgeCheck, ArrowRight, Sparkles, Search } from 'lucide-react';

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
    <GlassCard
      key={user.id}
      onClick={() => router.push(`/${user.username}`)}
      className="p-5 hover:bg-white/20 transition-all cursor-pointer group border-2 border-transparent hover:border-digis-cyan/30"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              className="w-16 h-16 rounded-full object-cover border-3 border-white/20 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-digis-cyan via-purple-500 to-digis-pink flex items-center justify-center text-2xl font-bold text-white border-3 border-white/20 shadow-lg">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
          )}
          {user.isCreatorVerified && (
            <div className="absolute -bottom-1 -right-1 bg-digis-cyan rounded-full p-1 shadow-lg">
              <BadgeCheck className="w-4 h-4 text-white fill-current" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-800 truncate text-lg">
              {user.displayName || user.username}
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{user.bio}</p>
          )}
          <div className="flex items-center gap-1 mt-2">
            <Users className="w-3 h-3 text-gray-500" />
            <p className="text-xs text-gray-600 font-medium">
              {user.followerCount.toLocaleString()} {user.followerCount === 1 ? 'follower' : 'followers'}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-400 group-hover:text-digis-cyan group-hover:translate-x-1 transition-all">
          <ArrowRight className="w-6 h-6" />
        </div>
      </div>
    </GlassCard>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-20 md:pb-8 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('followers')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'followers'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-gray-900 shadow-lg scale-105'
                : 'glass text-gray-700 hover:bg-white/20 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-gray-900 shadow-lg scale-105'
                : 'glass text-gray-700 hover:bg-white/20 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-5 h-5" />
            Following ({following.length})
          </button>
        </div>

        {/* Error */}
        {error && (
          <GlassCard className="bg-red-500/10 border-2 border-red-400 p-4 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </GlassCard>
        )}

        {/* Content */}
        <div className="space-y-3">
          {activeTab === 'followers' ? (
            followers.length > 0 ? (
              followers.map(renderUserCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Users className="w-20 h-20 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No followers yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Start creating content and share your profile to grow your community
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <GlassButton
                    variant="gradient"
                    onClick={() => router.push('/creator/dashboard')}
                    shimmer
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </GlassButton>
                </div>
              </GlassCard>
            )
          ) : (
            following.length > 0 ? (
              following.map(renderUserCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Search className="w-20 h-20 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Not following anyone yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Discover amazing creators and connect with your community
                </p>
                <GlassButton
                  variant="gradient"
                  onClick={() => router.push('/explore')}
                  shimmer
                >
                  <Search className="w-4 h-4 mr-2" />
                  Explore Creators
                </GlassButton>
              </GlassCard>
            )
          )}
        </div>
      </div>
    </div>
  );
}
