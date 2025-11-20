'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Users, DollarSign, Star } from 'lucide-react';

interface Subscriber {
  id: string;
  user: {
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
  totalPaid: number;
}

export default function SubscribersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
  });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const response = await fetch('/api/creator/subscriptions/subscribers');
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
        setStats(data.stats || { totalSubscribers: 0, totalRevenue: 0, activeSubscriptions: 0 });
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Your Subscribers</h1>
          <p className="text-gray-600">Manage and view your superfans</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Subscribers</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalSubscribers}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalRevenue} coins</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Star className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Subs</p>
                <p className="text-2xl font-bold text-gray-800">{stats.activeSubscriptions}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Subscribers List */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Active Subscribers</h3>

          {subscribers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No subscribers yet</h3>
              <p className="text-gray-600 mb-6">
                Set up your subscription tier to start getting superfans!
              </p>
              <GlassButton
                variant="gradient"
                onClick={() => router.push('/creator/subscriptions/setup')}
                shimmer
              >
                Set Up Subscriptions
              </GlassButton>
            </div>
          ) : (
            <div className="space-y-3">
              {subscribers.map((subscriber) => {
                const daysLeft = getDaysUntilExpiry(subscriber.expiresAt);

                return (
                  <div
                    key={subscriber.id}
                    className="flex items-center justify-between p-4 bg-white/60 border border-purple-200 rounded-lg hover:bg-white/80 transition-colors"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {subscriber.user.avatarUrl ? (
                          <img
                            src={subscriber.user.avatarUrl}
                            alt={subscriber.user.displayName || subscriber.user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">
                            {(subscriber.user.displayName || subscriber.user.username)[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800">
                          {subscriber.user.displayName || subscriber.user.username}
                        </div>
                        <div className="text-sm text-gray-600">@{subscriber.user.username}</div>
                      </div>
                    </div>

                    {/* Subscription Info */}
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Tier</div>
                        <div className="font-semibold text-gray-800">{subscriber.tier.name}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">Joined</div>
                        <div className="font-semibold text-gray-800">
                          {formatDate(subscriber.startedAt)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">Renews in</div>
                        <div className="font-semibold text-gray-800">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600">Total Paid</div>
                        <div className="font-semibold text-green-600">
                          {subscriber.totalPaid} coins
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/${subscriber.user.username}`)}
                        className="px-4 py-2 bg-digis-cyan/20 text-digis-cyan rounded-lg font-semibold hover:bg-digis-cyan/30 transition-colors"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Info Card */}
        {subscribers.length > 0 && (
          <GlassCard className="p-6 mt-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/30">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💡</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">About Subscriptions</h4>
                <p className="text-sm text-gray-700">
                  Subscribers currently renew manually every 30 days. Make sure to create exclusive
                  content for your superfans to keep them engaged! You earn 100% of subscription revenue.
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
