'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Users, BadgeCheck, ArrowRight, Search, Star, Calendar, ToggleLeft, ToggleRight, X } from 'lucide-react';

type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isCreatorVerified: boolean;
  followerCount: number;
};

type Subscription = {
  id: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  tier: {
    name: string;
    pricePerMonth: number;
  };
  startedAt: string;
  expiresAt: string;
  nextBillingAt: string;
  autoRenew: boolean;
  status: string;
};

export default function ConnectionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'subscriptions'>('following');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [followersRes, followingRes, subscriptionsRes] = await Promise.all([
        fetch('/api/user/followers'),
        fetch('/api/user/following'),
        fetch('/api/subscriptions/my-subscriptions'),
      ]);

      if (!followersRes.ok || !followingRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const followersData = await followersRes.json();
      const followingData = await followingRes.json();

      setFollowers(followersData.followers || []);
      setFollowing(followingData.following || []);

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData.subscriptions || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenew = async (subscriptionId: string, currentValue: boolean) => {
    setTogglingId(subscriptionId);
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/auto-renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRenew: !currentValue }),
      });
      if (response.ok) {
        setSubscriptions(subscriptions.map(sub =>
          sub.id === subscriptionId ? { ...sub, autoRenew: !currentValue } : sub
        ));
      }
    } catch (error) {
      console.error('Error toggling auto-renew:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    setCancelingId(subscriptionId);
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setCancelingId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilRenewal = (nextBillingAt: string) => {
    const now = new Date();
    const next = new Date(nextBillingAt);
    const diffTime = next.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
            onClick={() => setActiveTab('following')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Following ({following.length})
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'followers'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Followers ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg scale-105'
                : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Subscriptions ({subscriptions.length})
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
          {activeTab === 'following' && (
            following.length > 0 ? (
              following.map(renderUserCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Search className="w-20 h-20 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Not following anyone yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Discover amazing creators and start following them
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

          {activeTab === 'followers' && (
            followers.length > 0 ? (
              followers.map(renderUserCard)
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Users className="w-20 h-20 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No followers yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Share your profile to connect with others
                </p>
              </GlassCard>
            )
          )}

          {activeTab === 'subscriptions' && (
            subscriptions.length > 0 ? (
              subscriptions.map((sub) => {
                const daysUntilRenewal = getDaysUntilRenewal(sub.nextBillingAt);
                const isCancelled = sub.status === 'cancelled';

                return (
                  <GlassCard
                    key={sub.id}
                    className="p-5 border-2 border-transparent hover:border-digis-cyan/30"
                  >
                    <div className="flex items-start gap-4">
                      {/* Creator Avatar */}
                      <div
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                        onClick={() => router.push(`/${sub.creator.username}`)}
                      >
                        {sub.creator.avatarUrl ? (
                          <img
                            src={sub.creator.avatarUrl}
                            alt={sub.creator.displayName || sub.creator.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-xl">
                            {(sub.creator.displayName || sub.creator.username)?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>

                      {/* Subscription Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3
                              className="font-bold text-white text-lg cursor-pointer hover:text-digis-cyan transition-colors"
                              onClick={() => router.push(`/${sub.creator.username}`)}
                            >
                              {sub.creator.displayName || sub.creator.username}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
                              <span className="text-purple-400 font-medium">{sub.tier?.name || 'Subscription'}</span>
                              <span>•</span>
                              <span>{sub.tier?.pricePerMonth || 0} coins/month</span>
                            </div>
                          </div>
                          {isCancelled && (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                              Cancelled
                            </span>
                          )}
                        </div>

                        {/* Renewal Info */}
                        {!isCancelled && (
                          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-300">
                                {sub.autoRenew
                                  ? `Renews in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? 's' : ''}`
                                  : `Expires ${formatDate(sub.expiresAt)}`
                                }
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleAutoRenew(sub.id, sub.autoRenew)}
                              disabled={togglingId === sub.id}
                              className="disabled:opacity-50"
                            >
                              {sub.autoRenew ? (
                                <ToggleRight className="w-8 h-8 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-8 h-8 text-gray-500" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <GlassButton
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/${sub.creator.username}`)}
                          >
                            View Profile
                          </GlassButton>
                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelSubscription(sub.id)}
                              disabled={cancelingId === sub.id}
                              className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            ) : (
              <GlassCard className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl w-fit mx-auto mb-6">
                  <Star className="w-20 h-20 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No subscriptions yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto">
                  Subscribe to your favorite creators for exclusive content
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
