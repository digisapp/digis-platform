'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Ticket, Calendar, Clock, Coins, Users, Sparkles, Image } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function CreateShowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    showType: 'live_show' as const,
    ticketPrice: 50,
    maxTickets: null as number | null,
    scheduledStart: '',
    durationMinutes: 60,
    coverImageUrl: '',
  });

  const showTypes = [
    { value: 'live_show', label: 'Live Show', icon: '🎥', gradient: 'from-red-500 to-pink-500' },
    { value: 'qna', label: 'Q&A Session', icon: '❓', gradient: 'from-blue-500 to-cyan-500' },
    { value: 'workshop', label: 'Workshop', icon: '🎓', gradient: 'from-purple-500 to-violet-500' },
    { value: 'meetgreet', label: 'Meet & Greet', icon: '👋', gradient: 'from-green-500 to-emerald-500' },
    { value: 'performance', label: 'Performance', icon: '🎭', gradient: 'from-amber-500 to-orange-500' },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.user?.role !== 'creator') {
        router.push('/dashboard');
        return;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      router.push('/');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (formData.ticketPrice < 1) {
        throw new Error('Ticket price must be at least 1 coin');
      }
      if (!formData.scheduledStart) {
        throw new Error('Show date and time is required');
      }

      // Check if scheduled time is in the future
      const scheduledDate = new Date(formData.scheduledStart);
      if (scheduledDate <= new Date()) {
        throw new Error('Show must be scheduled in the future');
      }

      const response = await fetch('/api/shows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create show');
      }

      // Redirect to shows page on success
      router.push('/creator/shows');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create show');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum datetime (now + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-pastel-gradient md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-20 md:pb-8 max-w-7xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <GlassCard className="p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Show Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="My Exclusive Live Performance"
              className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-2">{formData.title.length}/100 characters</p>
          </GlassCard>

          {/* Description */}
          <GlassCard className="p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell your fans what to expect from this show..."
              rows={4}
              className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none transition-colors"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-2">{formData.description.length}/500 characters</p>
          </GlassCard>

          {/* Show Type */}
          <GlassCard className="p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Show Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {showTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, showType: type.value as any })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.showType === type.value
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg scale-105'
                      : 'border-gray-200 bg-white/40 hover:border-purple-300 hover:bg-white/60'
                  }`}
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <div className="text-sm font-semibold text-gray-800">{type.label}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Date, Time & Duration */}
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Show Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledStart}
                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                min={getMinDateTime()}
                className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                Must be at least 1 hour from now
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                Duration *
              </label>
              <select
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-green-500 transition-colors"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </GlassCard>
          </div>

          {/* Pricing & Tickets */}
          <div className="grid md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Ticket Price (coins) *
              </label>
              <input
                type="number"
                value={formData.ticketPrice}
                onChange={(e) => setFormData({ ...formData, ticketPrice: parseInt(e.target.value) || 0 })}
                min={1}
                max={10000}
                className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-xs text-gray-600 mt-2 font-medium">
                You'll earn 100% ({formData.ticketPrice.toLocaleString()} coins per ticket)
              </p>
            </GlassCard>

            <GlassCard className="p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600" />
                Maximum Tickets
              </label>
              <input
                type="number"
                value={formData.maxTickets || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  maxTickets: e.target.value ? parseInt(e.target.value) : null
                })}
                placeholder="Unlimited"
                min={1}
                max={10000}
                className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty for unlimited tickets
              </p>
            </GlassCard>
          </div>

          {/* Cover Image */}
          <GlassCard className="p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-pink-600" />
              Cover Image URL
            </label>
            <input
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 bg-white/60 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pink-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">
              Optional: Add a cover image for your show
            </p>
          </GlassCard>

          {/* Error Message */}
          {error && (
            <GlassCard className="bg-red-500/10 border-2 border-red-400 p-4">
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </GlassCard>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <GlassButton
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.back()}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="gradient"
              size="lg"
              className="flex-1"
              disabled={loading}
              shimmer
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Create Show
                </div>
              )}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}
