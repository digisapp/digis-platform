'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, UserPlus, BadgeCheck, ArrowRight, Sparkles, Search, Crown } from 'lucide-react';

type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isCreatorVerified: boolean;
  followerCount: number;
};

type Subscriber = User & {
  subscriptionStatus: string;
  subscriptionTier?: string;
  subscriptionStartedAt: string;
  subscriptionExpiresAt: string;
};

export default function FollowersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'subscribers'>('followers');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch followers, following, and subscribers
      const [followersRes, followingRes, subscribersRes] = await Promise.all([
        fetch('/api/user/followers'),
        fetch('/api/user/following'),
        fetch('/api/user/subscribers'),
      ]);

      if (!followersRes.ok || !followingRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const followersData = await followersRes.json();
      const followingData = await followingRes.json();

      // Subscribers might not exist yet, handle gracefully
      let subscribersData = { subscribers: [] };
      if (subscribersRes.ok) {
        subscribersData = await subscribersRes.json();
      }

      setFollowers(followersData.followers || []);
      setFollowing(followingData.following || []);
      setSubscribers(subscribersData.subscribers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
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
            <h3 className="font-bold text-white truncate text-lg">
              {user.displayName || user.username}
            </h3>
          </div>
          <p className="text-sm text-gray-300 mb-1">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{user.bio}</p>
          )}
          <div className="flex items-center gap-1 mt-2">
            <Users className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-300 font-medium">
              {user.followerCount.toLocaleString()} {user.followerCount === 1 ? 'follower' : 'followers'}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-500 group-hover:text-digis-cyan group-hover:translate-x-1 transition-all">
          <ArrowRight className="w-6 h-6" />
        </div>
      </div>
    </GlassCard>
  );

  const renderSubscriberCard = (subscriber: Subscriber) => {
    const daysRemaining = Math.ceil(
      (new Date(subscriber.subscriptionExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <GlassCard
        key={subscriber.id}
        onClick={() => router.push(`/${subscriber.username}`)}
        className="p-5 hover:bg-white/20 transition-all cursor-pointer group border-2 border-yellow-400/30 hover:border-yellow-500/50"
      >
        <div className="flex items-center gap-4">
          {/* Avatar with Crown */}
          <div className="relative flex-shrink-0">
            {subscriber.avatarUrl ? (
              <img
                src={subscriber.avatarUrl}
                alt={subscriber.displayName || subscriber.username}
                className="w-16 h-16 rounded-full object-cover border-3 border-yellow-400/40 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center text-2xl font-bold text-white border-3 border-yellow-400/40 shadow-lg">
                {(subscriber.displayName || subscriber.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-lg">
              <Crown className="w-4 h-4 text-white fill-current" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-white truncate text-lg">
                {subscriber.displayName || subscriber.username}
              </h3>
              {subscriber.isCreatorVerified && (
                <BadgeCheck className="w-4 h-4 text-digis-cyan fill-current" />
              )}
            </div>
            <p className="text-sm text-gray-300 mb-1">@{subscriber.username}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-yellow-400" />
                <p className="text-xs text-yellow-400 font-semibold">
                  {subscriber.subscriptionStatus === 'active' ? 'Active Subscriber' : 'Inactive'}
                </p>
              </div>
              {daysRemaining > 0 && (
                <p className="text-xs text-gray-400">
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </p>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="text-gray-500 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
      </GlassCard>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('followers')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'followers'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'subscribers'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Subscribers ({subscribers.length})
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
                  <Users className="w-20 h-20 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No followers yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
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
          ) : activeTab === 'following' ? (
            following.length > 0 ? (
              following.map(renderUserCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Search className="w-20 h-20 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Not following anyone yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
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
          ) : (
            subscribers.length > 0 ? (
              subscribers.map(renderSubscriberCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Crown className="w-20 h-20 text-yellow-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No subscribers yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Enable subscriptions and offer exclusive content to start earning recurring revenue
                </p>
                <GlassButton
                  variant="gradient"
                  onClick={() => router.push('/creator/subscriptions/setup')}
                  shimmer
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Set Up Subscriptions
                </GlassButton>
              </GlassCard>
            )
          )}
        </div>
      </div>
    </div>
  );
}
