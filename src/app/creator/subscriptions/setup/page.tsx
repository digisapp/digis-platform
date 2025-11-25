'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, DollarSign, Star, Users, ToggleLeft, ToggleRight, Plus, X } from 'lucide-react';

export default function SubscriptionSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    name: 'Superfan',
    description: '',
    pricePerMonth: 50,
    benefits: ['Exclusive content', 'Subscriber badge', 'Priority support'],
  });
  const [newBenefit, setNewBenefit] = useState('');
  const [stats, setStats] = useState({
    subscriberCount: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    fetchSubscriptionSettings();
  }, []);

  const fetchSubscriptionSettings = async () => {
    try {
      const response = await fetch('/api/creator/subscriptions/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.tier) {
          setFormData({
            enabled: data.tier.isActive,
            name: data.tier.name,
            description: data.tier.description || '',
            pricePerMonth: data.tier.pricePerMonth,
            benefits: data.tier.benefits || ['Exclusive content', 'Subscriber badge', 'Priority support'],
          });
          setStats({
            subscriberCount: data.tier.subscriberCount || 0,
            monthlyRevenue: (data.tier.subscriberCount || 0) * data.tier.pricePerMonth,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching subscription settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name for your subscription');
      return;
    }

    if (formData.pricePerMonth < 1) {
      alert('Price must be at least 1 coin per month');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/creator/subscriptions/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          pricePerMonth: formData.pricePerMonth,
          benefits: formData.benefits,
          isActive: formData.enabled,
        }),
      });

      if (response.ok) {
        alert('Subscription settings saved!');
        router.push('/creator/dashboard');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = () => {
    if (newBenefit.trim() && formData.benefits.length < 10) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()],
      });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8 max-w-4xl">
        <div className="space-y-6">
          {/* Stats Cards */}
          {formData.enabled && stats.subscriberCount > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Active Subscribers</p>
                    <p className="text-2xl font-bold text-white">{stats.subscriberCount}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <DollarSign className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-white">{stats.monthlyRevenue} coins</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Enable/Disable */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-digis-cyan/20 rounded-xl">
                  <Star className="w-6 h-6 text-digis-cyan" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Enable Subscriptions</h3>
                  <p className="text-sm text-gray-400">Allow fans to subscribe to your exclusive content</p>
                </div>
              </div>
              <button
                onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                className="p-2"
              >
                {formData.enabled ? (
                  <ToggleRight className="w-12 h-12 text-digis-cyan" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-gray-400" />
                )}
              </button>
            </div>
          </GlassCard>

          {/* Subscription Details */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Subscription Details</h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Subscription Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Superfan, VIP, Supporter"
                  className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                  maxLength={50}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Monthly Price *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.pricePerMonth}
                    onChange={(e) => setFormData({ ...formData, pricePerMonth: parseInt(e.target.value) || 1 })}
                    className="flex-1 px-4 py-3 bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                  />
                  <span className="text-gray-300 font-medium whitespace-nowrap">coins/month</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell fans what they get with a subscription..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Benefits
                </label>

                {/* Existing benefits */}
                <div className="space-y-2 mb-3">
                  {formData.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-black/40 border-2 border-cyan-500/30 rounded-lg"
                    >
                      <span className="text-green-500">✓</span>
                      <span className="flex-1 text-white">{benefit}</span>
                      <button
                        onClick={() => removeBenefit(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new benefit */}
                {formData.benefits.length < 10 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                      placeholder="Add a benefit..."
                      className="flex-1 px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                      maxLength={100}
                    />
                    <button
                      onClick={addBenefit}
                      className="px-4 py-2 bg-digis-cyan text-gray-900 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Save Buttons */}
          <div className="flex gap-4">
            <GlassButton
              variant="ghost"
              onClick={() => router.back()}
              className="flex-1 !text-gray-800 !border-gray-300 hover:!border-gray-400"
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="gradient"
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              shimmer
              className="flex-1 !text-white"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
