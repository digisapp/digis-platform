'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Upload, Image, Video, Grid3x3, DollarSign, Lock, Eye, Plus } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

export default function CreateContentPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'photo' as 'photo' | 'video' | 'gallery',
    unlockPrice: 0,
    isFree: true,
    file: null as File | null,
    files: [] as File[], // For gallery uploads
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]); // For gallery previews

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // For gallery: handle multiple files
    if (formData.contentType === 'gallery') {
      const fileArray = Array.from(files);
      setFormData({ ...formData, files: fileArray, file: null });

      // Create previews for all images
      const previewPromises = fileArray.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then(setPreviews);
    } else {
      // For photo/video: handle single file
      const file = files[0];
      setFormData({ ...formData, file, files: [] });

      // Create single preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: check if we have files
    const hasFiles = formData.contentType === 'gallery'
      ? formData.files.length > 0
      : formData.file !== null;

    if (!formData.title || !hasFiles) {
      showToast('Please provide a title and upload file(s)', 'error');
      return;
    }

    // Gallery requires at least 2 images
    if (formData.contentType === 'gallery' && formData.files.length < 2) {
      showToast('Gallery requires at least 2 images', 'error');
      return;
    }

    setUploading(true);

    try {
      // For videos: Upload directly to Supabase to bypass 4.5MB Vercel limit
      if (formData.contentType === 'video' && formData.file) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          showToast('You must be logged in to upload content', 'error');
          return;
        }

        // Upload video directly to Supabase storage
        const ext = formData.file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('content')
          .upload(fileName, formData.file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: formData.file.type,
          });

        if (uploadError) {
          showToast(`Upload failed: ${uploadError.message}`, 'error');
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('content').getPublicUrl(fileName);

        // Create content item via API (without file, just metadata)
        const response = await fetch('/api/content/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || '',
            contentType: formData.contentType,
            unlockPrice: formData.isFree ? 0 : formData.unlockPrice,
            thumbnailUrl: publicUrl,
            mediaUrl: publicUrl,
            durationSeconds: 0, // TODO: Extract actual video duration
          }),
        });

        if (response.ok) {
          showToast('Video uploaded successfully!', 'success');
          setTimeout(() => {
            router.push('/creator/content');
          }, 1500);
        } else {
          // Clean up uploaded file if database creation fails
          await supabase.storage.from('content').remove([fileName]);

          const data = await response.json();
          const errorMsg = data.details || data.error || 'Failed to create content';
          showToast(errorMsg, 'error');
        }
      } else {
        // For photos/galleries: Use API route (usually under 50MB)
        const uploadData = new FormData();

        // For gallery: append all files
        if (formData.contentType === 'gallery') {
          formData.files.forEach((file, index) => {
            uploadData.append('files', file);
          });
        } else {
          // For photo: append single file
          uploadData.append('file', formData.file!);
        }

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
        showToast('Content uploaded successfully!', 'success');
        // Redirect after showing toast
        setTimeout(() => {
          router.push('/creator/content');
        }, 1500);
      } else {
        // Handle 413 Content Too Large error
        if (response.status === 413) {
          showToast('File too large. Please use a smaller file or compress it first.', 'error');
        } else {
          try {
            const data = await response.json();
            const errorMsg = data.details || data.error || 'Failed to upload content';
            showToast(errorMsg, 'error');
            console.error('Upload error:', data);
          } catch (e) {
            // Response is not JSON (might be HTML error page)
            showToast('Upload failed. Please try again with a smaller file.', 'error');
          }
        }
      }
      } // Close else block for photos/galleries
    } catch (error) {
      console.error('Error uploading content:', error);
      showToast('Failed to upload content', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      {/* Mobile Header */}
      <MobileHeader />

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-end">
          <GlassButton
            variant="ghost"
            size="lg"
            onClick={() => router.push('/creator/content')}
            className="flex items-center gap-2"
          >
            <Grid3x3 className="w-5 h-5" />
            All Content
          </GlassButton>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Type */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Content Type</h3>
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
                <div className="text-sm font-semibold text-white">Photo</div>
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
                <div className="text-sm font-semibold text-white">Video</div>
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
                <div className="text-sm font-semibold text-white">Multiple</div>
              </button>
            </div>
          </GlassCard>

          {/* File Upload */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {formData.contentType === 'gallery' ? 'Upload Images (Multiple)' : 'Upload File'}
            </h3>

            {/* Gallery Preview: Multiple Images */}
            {formData.contentType === 'gallery' && previews.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full aspect-square rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = formData.files.filter((_, i) => i !== index);
                          const newPreviews = previews.filter((_, i) => i !== index);
                          setFormData({ ...formData, files: newFiles });
                          setPreviews(newPreviews);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <label className="block">
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-6 text-center cursor-pointer hover:border-digis-cyan hover:bg-white/40 transition-all">
                    <Plus className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-white font-medium text-sm">Add more images</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const newFiles = [...formData.files, ...Array.from(files)];
                      setFormData({ ...formData, files: newFiles });

                      const previewPromises = Array.from(files).map((file) => {
                        return new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onloadend = () => resolve(reader.result as string);
                          reader.readAsDataURL(file);
                        });
                      });

                      Promise.all(previewPromises).then((newPreviews) => {
                        setPreviews([...previews, ...newPreviews]);
                      });
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            ) : preview ? (
              /* Single File Preview */
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
              /* Upload Prompt */
              <label className="block">
                <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-digis-cyan hover:bg-white/40 transition-all">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-white font-medium mb-2">
                    {formData.contentType === 'gallery' ? 'Click to upload multiple images' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-sm text-gray-300">
                    {formData.contentType === 'gallery'
                      ? 'Select 2 or more images (JPG, PNG up to 50MB each)'
                      : formData.contentType === 'video'
                      ? 'MP4, MOV up to 500MB'
                      : 'JPG, PNG up to 50MB'}
                  </p>
                </div>
                <input
                  type="file"
                  accept={formData.contentType === 'video' ? 'video/*' : 'image/*'}
                  multiple={formData.contentType === 'gallery'}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </GlassCard>

          {/* Title & Description */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Give your content a catchy title"
                  className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what fans will get..."
                  className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                />
              </div>
            </div>
          </GlassCard>

          {/* Pricing */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pricing</h3>

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
                <div className={`text-sm font-semibold ${formData.isFree ? 'text-white' : 'text-gray-900'}`}>Free</div>
                <div className={`text-xs ${formData.isFree ? 'text-gray-300' : 'text-gray-700'}`}>Everyone can view</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isFree: false, unlockPrice: formData.unlockPrice || 100 })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  !formData.isFree
                    ? 'border-yellow-400 bg-yellow-500/10'
                    : 'border-purple-200 bg-white/60 hover:bg-white/80'
                }`}
              >
                <Lock className={`w-6 h-6 mx-auto mb-2 ${!formData.isFree ? 'text-yellow-400' : 'text-gray-600'}`} />
                <div className={`text-sm font-semibold ${!formData.isFree ? 'text-white' : 'text-gray-900'}`}>Locked</div>
                <div className={`text-xs ${!formData.isFree ? 'text-gray-300' : 'text-gray-700'}`}>Pay to unlock</div>
              </button>
            </div>

            {!formData.isFree && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">Unlock Price</label>
                <div className="flex items-center gap-4">
                  <DollarSign className="w-6 h-6 text-amber-500" />
                  <input
                    type="number"
                    min="1"
                    value={formData.unlockPrice}
                    onChange={(e) => setFormData({ ...formData, unlockPrice: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-900 font-semibold focus:outline-none focus:border-digis-cyan transition-colors"
                  />
                  <span className="text-gray-300">coins</span>
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
              disabled={
                uploading ||
                !formData.title ||
                (formData.contentType === 'gallery' ? formData.files.length === 0 : !formData.file)
              }
              shimmer
              className="flex-1"
            >
              <span className="text-white font-semibold">{uploading ? 'Uploading...' : 'Publish Content'}</span>
            </GlassButton>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
