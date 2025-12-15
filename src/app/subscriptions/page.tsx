'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Star, Calendar, DollarSign, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface Subscription {
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
    benefits: string[];
  };
  startedAt: string;
  expiresAt: string;
  nextBillingAt: string;
  totalPaid: number;
  autoRenew: boolean;
  status: string;
}

export default function MySubscriptionsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      // Using getUserSubscriptions from the service
      const response = await fetch('/api/subscriptions/my-subscriptions');
      if (response.ok) {
        const data = await response.json();
        // Transform data to match expected interface
        const transformed = (data.subscriptions || []).map((sub: any) => ({
          ...sub,
          tier: sub.tier ? {
            ...sub.tier,
            benefits: sub.tier.benefits
              ? (typeof sub.tier.benefits === 'string' ? JSON.parse(sub.tier.benefits) : sub.tier.benefits)
              : [],
          } : { name: 'Unknown', pricePerMonth: 0, benefits: [] },
        }));
        setSubscriptions(transformed);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
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
        // Update local state
        setSubscriptions(subscriptions.map(sub =>
          sub.id === subscriptionId ? { ...sub, autoRenew: !currentValue } : sub
        ));
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to update auto-renew');
      }
    } catch (error) {
      console.error('Error toggling auto-renew:', error);
      showError('Failed to update auto-renew');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCancelingId(subscriptionId);

    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message || 'Subscription cancelled');
        fetchSubscriptions(); // Refresh the list
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showError('Failed to cancel subscription');
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
      <div className="container mx-auto px-4 pt-4 pb-24 md:pb-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Subscriptions</h1>
          <p className="text-gray-600">Manage your creator subscriptions</p>
        </div>

        {/* Subscriptions List */}
        {subscriptions.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No subscriptions yet</h3>
            <p className="text-gray-600 mb-6">
              Subscribe to your favorite creators to support them with monthly memberships
            </p>
            <GlassButton
              variant="gradient"
              onClick={() => router.push('/explore')}
              shimmer
            >
              Explore Creators
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => {
              const daysUntilRenewal = getDaysUntilRenewal(subscription.nextBillingAt);
              const isCancelled = subscription.status === 'cancelled';

              return (
                <GlassCard key={subscription.id} className="p-6">
                  <div className="flex items-start gap-6">
                    {/* Creator Avatar */}
                    <div
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => router.push(`/${subscription.creator.username}`)}
                    >
                      {subscription.creator.avatarUrl ? (
                        <img
                          src={subscription.creator.avatarUrl}
                          alt={subscription.creator.displayName || subscription.creator.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {(subscription.creator.displayName || subscription.creator.username)?.[0]?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>

                    {/* Subscription Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3
                            className="text-xl font-bold text-gray-800 mb-1 cursor-pointer hover:text-digis-cyan transition-colors"
                            onClick={() => router.push(`/${subscription.creator.username}`)}
                          >
                            {subscription.creator.displayName || subscription.creator.username}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
                            <span className="font-semibold text-purple-600">{subscription.tier.name}</span>
                            <span>•</span>
                            <span>{subscription.tier.pricePerMonth} coins/month</span>
                          </div>
                        </div>

                        {isCancelled && (
                          <span className="px-3 py-1 bg-red-500/20 text-red-700 rounded-full text-sm font-semibold">
                            Cancelled
                          </span>
                        )}
                      </div>

                      {/* Billing Info */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-gray-600">Joined</div>
                            <div className="font-semibold text-gray-800">
                              {formatDate(subscription.startedAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <div>
                            <div className="text-gray-600">Total Paid</div>
                            <div className="font-semibold text-green-600">
                              {subscription.totalPaid} coins
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Auto-Renew Toggle */}
                      {!isCancelled && (
                        <div className="flex items-center justify-between p-3 bg-white/60 border border-purple-200 rounded-lg mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-gray-800">Auto-Renewal</div>
                              <div className="text-sm text-gray-600">
                                {subscription.autoRenew ? (
                                  <>Renews in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}</>
                                ) : (
                                  <>Expires {formatDate(subscription.expiresAt)}</>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleAutoRenew(subscription.id, subscription.autoRenew)}
                            disabled={togglingId === subscription.id}
                            className="p-2 disabled:opacity-50"
                          >
                            {subscription.autoRenew ? (
                              <ToggleRight className="w-12 h-12 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-12 h-12 text-gray-400" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* Benefits */}
                      {subscription.tier.benefits && subscription.tier.benefits.length > 0 && (
                        <div className="mb-4">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Benefits:</div>
                          <div className="space-y-1">
                            {subscription.tier.benefits.map((benefit, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-green-500">✓</span>
                                <span>{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <GlassButton
                          variant="ghost"
                          onClick={() => router.push(`/${subscription.creator.username}`)}
                        >
                          View Profile
                        </GlassButton>

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelSubscription(subscription.id)}
                            disabled={cancelingId === subscription.id}
                            className="px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            {cancelingId === subscription.id ? 'Cancelling...' : 'Cancel Subscription'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        {subscriptions.length > 0 && (
          <GlassCard className="p-6 mt-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/30">
            <div className="flex items-start gap-4">
              <span className="text-3xl">💡</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">About Auto-Renewal</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Subscriptions automatically renew every 30 days when enabled</li>
                  <li>• You can turn off auto-renewal anytime - you'll keep access until the end of your billing period</li>
                  <li>• If a renewal fails due to insufficient coins, you'll have 3 attempts before the subscription is cancelled</li>
                  <li>• Cancelling retains your subscriber benefits until your current period ends</li>
                </ul>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
