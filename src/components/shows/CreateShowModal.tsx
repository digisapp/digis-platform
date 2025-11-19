'use client';

import { useState } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CreateShowModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateShowModal({ onClose, onSuccess }: CreateShowModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticketPrice: 50,
    maxTickets: null as number | null,
    scheduledStart: '',
    durationMinutes: 60,
    coverImageUrl: '',
  });

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

      onSuccess();
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-xl bg-white/95 rounded-3xl border-2 border-purple-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Show</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 text-2xl"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="My Exclusive Live Performance"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-400"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell your fans what to expect from this show..."
                rows={4}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-400 resize-none"
                maxLength={500}
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledStart}
                onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                min={getMinDateTime()}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 focus:outline-none focus:border-purple-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 1 hour from now
              </p>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes) *
              </label>
              <select
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 focus:outline-none focus:border-purple-400"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>

            {/* Ticket Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Price (coins) *
              </label>
              <input
                type="number"
                value={formData.ticketPrice}
                onChange={(e) => setFormData({ ...formData, ticketPrice: parseInt(e.target.value) || 0 })}
                min={1}
                max={10000}
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Max Tickets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Tickets (optional)
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
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for unlimited tickets
              </p>
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image URL (optional)
              </label>
              <input
                type="url"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-purple-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <GlassButton
                type="button"
                variant="ghost"
                size="lg"
                onClick={onClose}
                className="flex-1 !text-gray-900 font-semibold"
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
                glow
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Create Show'}
              </GlassButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
