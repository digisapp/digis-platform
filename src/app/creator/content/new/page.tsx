'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ArrowLeft, Upload, Image, Video, Grid3x3, DollarSign, Lock, Eye } from 'lucide-react';

export default function CreateContentPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'photo' as 'photo' | 'video' | 'gallery',
    unlockPrice: 0,
    isFree: true,
    file: null as File | null,
  });
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData({ ...formData, file });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.file) {
      alert('Please provide a title and upload a file');
      return;
    }

    setUploading(true);

    try {
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('file', formData.file);
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description || '');
      uploadData.append('contentType', formData.contentType);
      uploadData.append('unlockPrice', formData.unlockPrice.toString());
      uploadData.append('isFree', formData.isFree.toString());

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: uploadData,
      });

      if (response.ok) {
        alert('Content uploaded successfully!');
        router.push('/creator/content');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to upload content');
      }
    } catch (error) {
      console.error('Error uploading content:', error);
      alert('Failed to upload content');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 pt-0 md:pt-4 pb-20 md:pb-8 max-w-7xl">
        {/* Header */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Type */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Content Type</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, contentType: 'photo' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  formData.contentType === 'photo'
                    ? 'border-digis-cyan bg-digis-cyan/10'
                    : 'border-purple-200 bg-white/60 hover:bg-white/80'
                }`}
              >
                <Image className={`w-8 h-8 mx-auto mb-2 ${formData.contentType === 'photo' ? 'text-digis-cyan' : 'text-gray-600'}`} />
                <div className="text-sm font-semibold text-gray-800">Photo</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, contentType: 'video' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  formData.contentType === 'video'
                    ? 'border-digis-cyan bg-digis-cyan/10'
                    : 'border-purple-200 bg-white/60 hover:bg-white/80'
                }`}
              >
                <Video className={`w-8 h-8 mx-auto mb-2 ${formData.contentType === 'video' ? 'text-digis-cyan' : 'text-gray-600'}`} />
                <div className="text-sm font-semibold text-gray-800">Video</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, contentType: 'gallery' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  formData.contentType === 'gallery'
                    ? 'border-digis-cyan bg-digis-cyan/10'
                    : 'border-purple-200 bg-white/60 hover:bg-white/80'
                }`}
              >
                <Grid3x3 className={`w-8 h-8 mx-auto mb-2 ${formData.contentType === 'gallery' ? 'text-digis-cyan' : 'text-gray-600'}`} />
                <div className="text-sm font-semibold text-gray-800">Gallery</div>
              </button>
            </div>
          </GlassCard>

          {/* File Upload */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload File</h3>

            {preview ? (
              <div className="relative">
                {formData.contentType === 'video' ? (
                  <video src={preview} controls className="w-full rounded-xl max-h-96 object-contain bg-black" />
                ) : (
                  <img src={preview} alt="Preview" className="w-full rounded-xl max-h-96 object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setFormData({ ...formData, file: null });
                  }}
                  className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="block">
                <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-digis-cyan hover:bg-white/40 transition-all">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-700 font-medium mb-2">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-600">
                    {formData.contentType === 'video' ? 'MP4, MOV up to 500MB' : 'JPG, PNG up to 50MB'}
                  </p>
                </div>
                <input
                  type="file"
                  accept={formData.contentType === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </GlassCard>

          {/* Title & Description */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Give your content a catchy title"
                  className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what fans will get..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                />
              </div>
            </div>
          </GlassCard>

          {/* Pricing */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pricing</h3>

            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isFree: true, unlockPrice: 0 })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  formData.isFree
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-purple-200 bg-white/60 hover:bg-white/80'
                }`}
              >
                <Eye className={`w-6 h-6 mx-auto mb-2 ${formData.isFree ? 'text-green-500' : 'text-gray-600'}`} />
                <div className="text-sm font-semibold text-gray-800">Free</div>
                <div className="text-xs text-gray-600">Everyone can view</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isFree: false })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  !formData.isFree
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-purple-200 bg-white/60 hover:bg-white/80'
                }`}
              >
                <Lock className={`w-6 h-6 mx-auto mb-2 ${!formData.isFree ? 'text-amber-500' : 'text-gray-600'}`} />
                <div className="text-sm font-semibold text-gray-800">Locked</div>
                <div className="text-xs text-gray-600">Pay to unlock</div>
              </button>
            </div>

            {!formData.isFree && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unlock Price</label>
                <div className="flex items-center gap-4">
                  <DollarSign className="w-6 h-6 text-amber-500" />
                  <input
                    type="number"
                    min="1"
                    value={formData.unlockPrice}
                    onChange={(e) => setFormData({ ...formData, unlockPrice: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold focus:outline-none focus:border-digis-cyan transition-colors"
                  />
                  <span className="text-gray-600">coins</span>
                </div>

                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Fans will pay {formData.unlockPrice} coins to unlock and view this content
                  </p>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Submit */}
          <div className="flex gap-4">
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="gradient"
              disabled={uploading || !formData.title || !formData.file}
              shimmer
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Publish Content'}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}
