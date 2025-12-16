'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Users, BadgeCheck, ArrowRight, Sparkles, Search, Crown, Ban, UserX, Loader2 } from 'lucide-react';

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

type BlockedUser = {
  id: string;
  blockedId: string;
  reason: string | null;
  createdAt: string;
  blockedUser: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <CommunityContent />
    </Suspense>
  );
}

function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'subscribers' | 'blocked'>('followers');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Set initial tab from URL parameter
  useEffect(() => {
    if (tabParam === 'subscribers' || tabParam === 'following' || tabParam === 'blocked') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch followers, following, subscribers, and blocked users
      const [followersRes, followingRes, subscribersRes, blockedRes] = await Promise.all([
        fetch('/api/user/followers'),
        fetch('/api/user/following'),
        fetch('/api/user/subscribers'),
        fetch('/api/users/block'),
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

      // Blocked users
      let blockedData = { blockedUsers: [] };
      if (blockedRes.ok) {
        blockedData = await blockedRes.json();
      }

      setFollowers(followersData.followers || []);
      setFollowing(followingData.following || []);
      setSubscribers(subscribersData.subscribers || []);
      setBlockedUsers(blockedData.blockedUsers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (blockedId: string) => {
    if (!confirm('Are you sure you want to unblock this user?')) return;

    setUnblockingId(blockedId);
    try {
      const response = await fetch('/api/users/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId }),
      });

      if (response.ok) {
        setBlockedUsers(prev => prev.filter(u => u.blockedId !== blockedId));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to unblock user');
      }
    } catch (err) {
      setError('Failed to unblock user');
    } finally {
      setUnblockingId(null);
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

  const renderBlockedUserCard = (block: BlockedUser) => (
    <GlassCard
      key={block.id}
      className="p-5 border-2 border-red-500/20"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {block.blockedUser.avatarUrl ? (
            <img
              src={block.blockedUser.avatarUrl}
              alt={block.blockedUser.username || 'User'}
              className="w-16 h-16 rounded-full object-cover border-3 border-red-500/30 shadow-lg opacity-70"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-2xl font-bold text-white border-3 border-red-500/30 shadow-lg opacity-70">
              {block.blockedUser.username?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 shadow-lg">
            <Ban className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white truncate text-lg">
              {block.blockedUser.displayName || block.blockedUser.username || 'Unknown'}
            </h3>
          </div>
          {block.blockedUser.username && (
            <p className="text-sm text-gray-300 mb-1">@{block.blockedUser.username}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Blocked {new Date(block.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Unblock Button */}
        <button
          type="button"
          onClick={() => handleUnblockUser(block.blockedId)}
          disabled={unblockingId === block.blockedId}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {unblockingId === block.blockedId ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Unblock'
          )}
        </button>
      </div>
    </GlassCard>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'subscribers'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Subscribers ({subscribers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'blocked'
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Blocked ({blockedUsers.length})
          </button>
        </div>

        {/* Error */}
        {error && (
          <GlassCard className="bg-red-500/10 border-2 border-red-400 p-4 mb-6">
            <p className="text-red-400 font-medium">{error}</p>
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
          ) : activeTab === 'subscribers' ? (
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
          ) : (
            // Blocked Users Tab
            blockedUsers.length > 0 ? (
              blockedUsers.map(renderBlockedUserCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl w-fit mx-auto mb-6">
                  <UserX className="w-20 h-20 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No blocked users</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  You haven't blocked anyone. Blocked users cannot view your streams, send messages, gifts, or call requests.
                </p>
              </GlassCard>
            )
          )}
        </div>
      </div>
    </div>
  );
}
