'use client';

import { useState } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import { Upload, X, Unlock, Lock } from 'lucide-react';

interface CreateShowModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateShowModal({ onClose, onSuccess }: CreateShowModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [isPaid, setIsPaid] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticketPrice: 50,
    maxTickets: null as number | null,
    scheduledStart: '',
    durationMinutes: 5,
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
      if (isPaid && formData.ticketPrice < 1) {
        throw new Error('Ticket price must be at least 1 coin');
      }
      if (!formData.scheduledStart) {
        throw new Error('Stream date and time is required');
      }

      // Check if scheduled time is in the future
      const scheduledDate = new Date(formData.scheduledStart);
      if (scheduledDate <= new Date()) {
        throw new Error('Stream must be scheduled in the future');
      }

      const response = await fetch('/api/shows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ticketPrice: isPaid ? formData.ticketPrice : 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create stream');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl border-2 border-digis-cyan shadow-[0_0_30px_rgba(0,255,255,0.3)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Create Stream</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-digis-cyan text-2xl transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Free/Paid Toggle */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Access Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaid(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    !isPaid
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                      : 'bg-white/10 text-gray-400 border border-white/20 hover:border-green-500/50'
                  }`}
                >
                  <Unlock className="w-5 h-5" />
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaid(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    isPaid
                      ? 'bg-gradient-to-r from-digis-pink to-purple-500 text-white shadow-lg shadow-pink-500/30'
                      : 'bg-white/10 text-gray-400 border border-white/20 hover:border-pink-500/50'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  Paid
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {isPaid
                  ? 'Fans must purchase a ticket to join your stream'
                  : 'Anyone can join your stream for free'}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Stream Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Yoga Class with Me"
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell your fans what to expect from this stream..."
                rows={4}
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-cyan/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all resize-none"
                maxLength={500}
              />
            </div>

            {/* Date & Time + Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Stream Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                  min={getMinDateTime()}
                  className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-cyan/30 rounded-lg text-white focus:outline-none focus:border-digis-cyan focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  At least 1 hour from now
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Duration *
                </label>
                <select
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-cyan/30 rounded-lg text-white focus:outline-none focus:border-digis-cyan focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>
            </div>

            {/* Ticket Price + Max Tickets (only shown if Paid) */}
            {isPaid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-digis-pink/10 border border-digis-pink/30">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Ticket Price (coins) *
                  </label>
                  <input
                    type="number"
                    value={formData.ticketPrice}
                    onChange={(e) => setFormData({ ...formData, ticketPrice: parseInt(e.target.value) || 0 })}
                    min={1}
                    max={10000}
                    className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-pink/30 rounded-lg text-white focus:outline-none focus:border-digis-pink focus:shadow-[0_0_10px_rgba(255,20,147,0.3)] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
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
                    className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-pink/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-pink focus:shadow-[0_0_10px_rgba(255,20,147,0.3)] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Cover Image (optional)
              </label>

              {coverPreview ? (
                <div className="relative">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-digis-cyan/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                  />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-digis-cyan/30 rounded-lg cursor-pointer bg-black/40 hover:bg-black/60 hover:border-digis-cyan transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingCover ? (
                      <>
                        <LoadingSpinner size="md" />
                        <p className="mt-2 text-sm text-gray-300">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-digis-cyan mb-3" />
                        <p className="text-sm text-white font-semibold">Click to upload cover image</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF or WebP (max 5MB)</p>
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
              <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-3 text-red-300 text-sm shadow-[0_0_15px_rgba(255,0,0,0.3)]">
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
                className="flex-1 !text-white font-semibold border-2 border-gray-600 hover:border-gray-400"
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
                {loading ? <LoadingSpinner size="sm" /> : <span className="text-white font-bold">Create Stream</span>}
              </GlassButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
