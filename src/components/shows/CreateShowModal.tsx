'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import { Upload, X, Unlock, Lock, Radio } from 'lucide-react';

interface CreateShowModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateShowModal({ onClose, onSuccess }: CreateShowModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [isPaid, setIsPaid] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticketPrice: 5,
    maxTickets: null as number | null,
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

      // Set scheduled start to now (go live immediately)
      const now = new Date();
      const scheduledStart = now.toISOString();

      const response = await fetch('/api/shows/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ticketPrice: isPaid ? formData.ticketPrice : 0,
          scheduledStart,
          durationMinutes: 60, // Default 1 hour, can extend while live
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create stream');
      }

      // Redirect to the stream page to start broadcasting
      onSuccess();
      router.push(`/creator/streams/${data.show.id}/live`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl border-2 border-digis-cyan shadow-[0_0_30px_rgba(0,255,255,0.3)] max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20">
                <Radio className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Go Live</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-digis-cyan text-2xl transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Stream Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What's your stream about?"
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-cyan/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Description <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell your fans what to expect..."
                rows={3}
                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-cyan/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all resize-none"
                maxLength={500}
              />
            </div>

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
            </div>

            {/* Ticket Price (only shown if Paid) */}
            {isPaid && (
              <div className="p-4 rounded-xl bg-digis-pink/10 border border-digis-pink/30">
                <label className="block text-sm font-semibold text-white mb-2">
                  Ticket Price (coins)
                </label>
                <input
                  type="number"
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={10000}
                  className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border-2 border-digis-pink/30 rounded-xl text-white focus:outline-none focus:border-digis-pink focus:shadow-[0_0_10px_rgba(255,20,147,0.3)] transition-all"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Fans must purchase a ticket to join your stream
                </p>
              </div>
            )}

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Cover Image <span className="text-gray-500">(optional)</span>
              </label>

              {coverPreview ? (
                <div className="relative">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-40 object-cover rounded-xl border-2 border-digis-cyan/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
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
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-digis-cyan/30 rounded-xl cursor-pointer bg-black/40 hover:bg-black/60 hover:border-digis-cyan transition-all">
                  <div className="flex flex-col items-center justify-center py-4">
                    {uploadingCover ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <p className="mt-2 text-sm text-gray-300">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-digis-cyan mb-2" />
                        <p className="text-sm text-gray-400">Click to upload</p>
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
              <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-3 text-red-300 text-sm shadow-[0_0_15px_rgba(255,0,0,0.3)]">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
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
                className="flex-1 !bg-gradient-to-r !from-red-500 !to-pink-500"
                disabled={loading}
                shimmer
                glow
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="text-white font-bold flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    Go Live
                  </span>
                )}
              </GlassButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
