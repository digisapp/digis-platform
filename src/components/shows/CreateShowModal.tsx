'use client';

import { useState } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import { Upload, X } from 'lucide-react';

interface CreateShowModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateShowModal({ onClose, onSuccess }: CreateShowModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticketPrice: 50,
    maxTickets: null as number | null,
    scheduledStart: '',
    durationMinutes: 60,
    coverImageUrl: '',
  });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file, 'show-cover');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingCover(true);
    setError('');

    try {
      // Get current user ID
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (!data.user?.id) {
        throw new Error('Not authenticated');
      }

      // Resize image to max 1920x1080 (16:9)
      const resizedFile = await resizeImage(file, 1920, 1080);

      // Upload to Supabase Storage (show-covers bucket)
      const url = await uploadImage(resizedFile, 'show-cover', data.user.id);

      // Update form data and preview
      setFormData({ ...formData, coverImageUrl: url });
      setCoverPreview(url);
    } catch (err: any) {
      console.error('Cover upload error:', err);
      setError(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCoverImage = () => {
    setFormData({ ...formData, coverImageUrl: '' });
    setCoverPreview('');
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

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image (optional)
              </label>

              {coverPreview ? (
                <div className="relative">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-purple-200"
                  />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-200 rounded-lg cursor-pointer bg-white/60 hover:bg-white/80 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingCover ? (
                      <>
                        <LoadingSpinner size="md" />
                        <p className="mt-2 text-sm text-gray-600">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 font-semibold">Click to upload cover image</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF or WebP (max 5MB)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                </label>
              )}
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
