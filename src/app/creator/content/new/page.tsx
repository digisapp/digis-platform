'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Upload, Grid3x3, Coins, Lock, Eye, Plus, X, Image, Video, AlertTriangle, HardDrive } from 'lucide-react';
import * as tus from 'tus-js-client';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { generateVideoThumbnail, ThumbnailResult } from '@/lib/utils/video-thumbnail';
import { VideoThumbnailPicker } from '@/components/content/VideoThumbnailPicker';

type ContentType = 'photo' | 'video' | 'gallery';

const MAX_VIDEO_SIZE = 300 * 1024 * 1024; // 300MB
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50MB
const MAX_STORAGE_QUOTA = 2 * 1024 * 1024 * 1024; // 2GB per creator

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

export default function CreateContentPage() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  // Auth check - verify user is a creator
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Check role
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.user?.role !== 'creator') {
        router.push('/dashboard');
        return;
      }

      setStorageUsed(data.user?.storageUsed || 0);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'photo' as ContentType,
    unlockPrice: 0,
    isFree: true,
    file: null as File | null,
    files: [] as File[],
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoThumbnail, setVideoThumbnail] = useState<ThumbnailResult | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFileKeys, setUploadedFileKeys] = useState<Set<string>>(new Set());

  // Extract video duration from file
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => {
        resolve(0);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // Auto-detect content type and handle files
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const firstFile = fileArray[0];
    const isVideo = firstFile.type.startsWith('video/');

    // Clear previous file size errors
    setFileSizeError(null);

    if (isVideo) {
      // Check video file size
      if (firstFile.size > MAX_VIDEO_SIZE) {
        setFileSizeError(`Video is ${formatFileSize(firstFile.size)} — max is ${formatFileSize(MAX_VIDEO_SIZE)}. Compress the video or use a shorter clip.`);
        return;
      }

      // Check storage quota
      if (storageUsed + firstFile.size > MAX_STORAGE_QUOTA) {
        setFileSizeError(`Upload would exceed your ${formatFileSize(MAX_STORAGE_QUOTA)} storage limit. Delete old content to free space.`);
        return;
      }

      // Video mode - single video file
      setFormData({ ...formData, contentType: 'video', file: firstFile, files: [] });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(firstFile);

      // Get duration
      const duration = await getVideoDuration(firstFile);
      setVideoDuration(duration);
      setPreviews([]);

      // Generate video thumbnail
      setGeneratingThumbnail(true);
      try {
        const thumbnail = await generateVideoThumbnail(firstFile);
        setVideoThumbnail(thumbnail);
      } catch (err) {
        console.error('Failed to generate video thumbnail:', err);
        // Continue without thumbnail - will use video URL as fallback
      } finally {
        setGeneratingThumbnail(false);
      }
    } else if (fileArray.length === 1) {
      // Check image file size
      if (firstFile.size > MAX_IMAGE_SIZE) {
        setFileSizeError(`Image is ${formatFileSize(firstFile.size)} — max is ${formatFileSize(MAX_IMAGE_SIZE)}.`);
        return;
      }
      // Single image - photo mode
      setFormData({ ...formData, contentType: 'photo', file: firstFile, files: [] });

      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(firstFile);
      setPreviews([]);
    } else {
      // Multiple images - gallery mode
      const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
      const oversized = imageFiles.find(f => f.size > MAX_IMAGE_SIZE);
      if (oversized) {
        setFileSizeError(`"${oversized.name}" is ${formatFileSize(oversized.size)} — max is ${formatFileSize(MAX_IMAGE_SIZE)} per image.`);
        return;
      }
      const totalSize = imageFiles.reduce((sum, f) => sum + f.size, 0);
      if (storageUsed + totalSize > MAX_STORAGE_QUOTA) {
        setFileSizeError(`Gallery total is ${formatFileSize(totalSize)} — would exceed your ${formatFileSize(MAX_STORAGE_QUOTA)} storage limit.`);
        return;
      }
      setFormData({ ...formData, contentType: 'gallery', file: null, files: imageFiles });

      // Create previews for all
      const previewPromises = imageFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      const newPreviews = await Promise.all(previewPromises);
      setPreviews(newPreviews);
      setPreview(null);
    }
  };

  // Add more images to gallery
  const handleAddMoreImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newFiles = [...formData.files, ...imageFiles];
    setFormData({ ...formData, files: newFiles, contentType: 'gallery' });

    const previewPromises = imageFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    const newPreviews = await Promise.all(previewPromises);
    setPreviews([...previews, ...newPreviews]);
  };

  // Remove a file from gallery
  const removeGalleryImage = (index: number) => {
    const newFiles = formData.files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    if (newFiles.length === 1) {
      // Switch to single photo mode
      setFormData({ ...formData, contentType: 'photo', file: newFiles[0], files: [] });
      setPreview(newPreviews[0]);
      setPreviews([]);
    } else if (newFiles.length === 0) {
      // Clear everything
      setFormData({ ...formData, contentType: 'photo', file: null, files: [] });
      setPreviews([]);
    } else {
      setFormData({ ...formData, files: newFiles });
      setPreviews(newPreviews);
    }
  };

  // Clear all files
  const clearFiles = () => {
    setFormData({ ...formData, contentType: 'photo', file: null, files: [] });
    setPreview(null);
    setPreviews([]);
    setVideoDuration(0);
    setVideoThumbnail(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasFiles = formData.contentType === 'gallery'
      ? formData.files.length > 0
      : formData.file !== null;

    if (!formData.title || !hasFiles) {
      showToast('Please provide a title and upload file(s)', 'error');
      return;
    }

    if (formData.contentType === 'gallery' && formData.files.length < 2) {
      showToast('Gallery requires at least 2 images', 'error');
      return;
    }

    // Duplicate detection: check if same file was already uploaded this session
    const fileKey = formData.contentType === 'gallery'
      ? formData.files.map(f => `${f.name}:${f.size}`).join('|')
      : `${formData.file?.name}:${formData.file?.size}`;
    if (uploadedFileKeys.has(fileKey)) {
      showToast('This file was already uploaded. Choose a different file.', 'error');
      return;
    }

    setUploading(true);

    try {
      if (formData.contentType === 'video' && formData.file) {
        // Video: Upload directly to Supabase to bypass Vercel limit
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          showToast('You must be logged in to upload content', 'error');
          return;
        }

        const ext = formData.file.name.split('.').pop()?.toLowerCase() || 'mp4';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const fileSizeMB = (formData.file.size / (1024 * 1024)).toFixed(1);

        // Resumable upload with tus protocol (auto-retries on network failure)
        setUploadProgress(0);
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        const publicUrl = await new Promise<string>((resolve, reject) => {
          const upload = new tus.Upload(formData.file!, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 1000, 3000, 5000],
            headers: {
              authorization: `Bearer ${session?.access_token}`,
              'x-upsert': 'false',
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
              bucketName: 'content',
              objectName: fileName,
              contentType: formData.file!.type,
              cacheControl: '31536000',
            },
            chunkSize: 6 * 1024 * 1024, // 6MB chunks
            onError: (error) => {
              const msg = error.message || 'Upload failed';
              if (msg.toLowerCase().includes('size') || msg.includes('413')) {
                reject(new Error(`Video too large (${fileSizeMB}MB). Max is 300MB — compress the video or use a shorter clip.`));
              } else {
                reject(new Error('Upload failed — check your connection and try again.'));
              }
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
            },
            onSuccess: () => {
              const { data: { publicUrl: url } } = supabase.storage.from('content').getPublicUrl(fileName);
              resolve(url);
            },
          });

          // Check for previous upload to resume
          upload.findPreviousUploads().then((previousUploads) => {
            if (previousUploads.length > 0) {
              upload.resumeFromPreviousUpload(previousUploads[0]);
            }
            upload.start();
          });
        });

        setUploadProgress(100);

        // Upload video thumbnail if we have one
        let thumbnailUrl = publicUrl; // Fallback to video URL
        if (videoThumbnail) {
          try {
            const thumbnailFormData = new FormData();
            thumbnailFormData.append('file', videoThumbnail.blob, `thumbnail-${Date.now()}.jpg`);

            const thumbResponse = await fetch('/api/upload/thumbnail', {
              method: 'POST',
              body: thumbnailFormData,
            });

            if (thumbResponse.ok) {
              const thumbResult = await thumbResponse.json();
              thumbnailUrl = thumbResult.data?.url || thumbnailUrl;
            }
          } catch (thumbError) {
            console.error('Failed to upload thumbnail:', thumbError);
            // Continue with video URL as thumbnail
          }
        }

        const response = await fetch('/api/content/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description || '',
            contentType: formData.contentType,
            unlockPrice: formData.isFree ? 0 : formData.unlockPrice,
            thumbnailUrl,
            mediaUrl: publicUrl,
            durationSeconds: videoDuration,
            fileSize: formData.file!.size,
          }),
        });

        if (response.ok) {
          setUploadedFileKeys(prev => new Set(prev).add(fileKey));
          showToast('Video uploaded successfully!', 'success');
          setTimeout(() => router.push('/creator/content'), 1500);
        } else {
          await supabase.storage.from('content').remove([fileName]);
          const data = await response.json();
          showToast(data.error || 'Upload failed. Please try again.', 'error');
        }
      } else {
        // Photos/galleries: Use API route
        const uploadData = new FormData();

        if (formData.contentType === 'gallery') {
          formData.files.forEach((file) => {
            uploadData.append('files', file);
          });
        } else {
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
          setUploadedFileKeys(prev => new Set(prev).add(fileKey));
          showToast('Content uploaded successfully!', 'success');
          setTimeout(() => router.push('/creator/content'), 1500);
        } else if (response.status === 413) {
          showToast('File too large. Please use a smaller file.', 'error');
        } else {
          try {
            const data = await response.json();
            showToast(data.error || 'Upload failed. Please try again.', 'error');
          } catch {
            showToast('Upload failed. Please try again.', 'error');
          }
        }
      }
    } catch (error: any) {
      console.error('Error uploading content:', error);
      showToast(error?.message || 'Failed to upload content', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const hasContent = formData.file || formData.files.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container mx-auto px-4 pt-2 md:pt-8 pb-24 md:pb-8 max-w-6xl">

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">New Post</h1>
            <p className="text-sm text-gray-400">Upload · Add details · Post</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="md:grid md:grid-cols-[1fr_380px] md:gap-6 space-y-4 md:space-y-0">

            {/* LEFT: Upload Area */}
            <GlassCard className="p-6 flex flex-col md:min-h-[540px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
                <h3 className="text-lg font-semibold text-white">Upload your content</h3>
              </div>

              <div className="flex-1 flex flex-col">
                {formData.contentType === 'gallery' && previews.length > 0 ? (
                  /* Gallery Preview */
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Grid3x3 className="w-5 h-5 text-digis-cyan" />
                        <span className="text-white font-medium">{previews.length} images selected</span>
                      </div>
                      <button type="button" onClick={clearFiles} className="text-sm text-red-400 hover:text-red-300">
                        Clear all
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {previews.map((p, index) => (
                        <div key={index} className="relative group aspect-square">
                          <img src={p} alt={`Preview ${index + 1}`} className="w-full h-full rounded-xl object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <label className="block">
                      <div className="border-2 border-dashed border-white/30 rounded-xl p-4 text-center cursor-pointer hover:border-digis-cyan hover:bg-white/5 transition-all">
                        <Plus className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                        <p className="text-sm text-gray-300">Add more images</p>
                      </div>
                      <input type="file" accept="image/*" multiple onChange={handleAddMoreImages} className="hidden" />
                    </label>
                  </div>
                ) : preview ? (
                  /* Single File Preview */
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {formData.contentType === 'video' ? (
                          <Video className="w-5 h-5 text-digis-cyan" />
                        ) : (
                          <Image className="w-5 h-5 text-digis-cyan" />
                        )}
                        <span className="text-white font-medium">
                          {formData.contentType === 'video' ? 'Video' : 'Photo'} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {formData.file && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatFileSize(formData.file.size)}
                          </span>
                        )}
                        <button type="button" onClick={clearFiles} className="text-sm text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      </div>
                    </div>
                    {formData.contentType === 'video' ? (
                      <div className="space-y-3">
                        <video src={preview} controls className="w-full rounded-xl max-h-96 object-contain bg-black" />
                        <VideoThumbnailPicker
                          videoFile={formData.file!}
                          thumbnail={videoThumbnail}
                          onThumbnailChange={setVideoThumbnail}
                          generating={generatingThumbnail}
                          setGenerating={setGeneratingThumbnail}
                        />
                      </div>
                    ) : (
                      <img src={preview} alt="Preview" className="w-full rounded-xl max-h-[420px] object-contain" />
                    )}
                  </div>
                ) : (
                  /* Empty Upload Drop Zone — big and inviting */
                  <>
                  {fileSizeError && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-300">{fileSizeError}</p>
                        <button type="button" onClick={() => setFileSizeError(null)} className="text-xs text-red-400/70 hover:text-red-300 mt-1">Dismiss</button>
                      </div>
                    </div>
                  )}
                  <label className="block cursor-pointer flex-1">
                    <div className="border-2 border-dashed border-white/20 rounded-2xl text-center hover:border-digis-cyan hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-5 h-full min-h-[300px] md:min-h-[420px] p-8">
                      <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-white/20 flex items-center justify-center">
                        <Upload className="w-9 h-9 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg mb-1">Drop files here or click to browse</p>
                        <p className="text-sm text-gray-400 mb-1">Photos, videos, or select multiple for a gallery</p>
                        <p className="text-xs text-gray-500 mb-3">Videos up to 300MB · Images up to 50MB</p>
                        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Photo</span>
                          <span className="text-gray-700">·</span>
                          <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Video</span>
                          <span className="text-gray-700">·</span>
                          <span className="flex items-center gap-1.5"><Grid3x3 className="w-3.5 h-3.5" /> Gallery</span>
                        </div>
                      </div>
                    </div>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
                  </label>
                  </>
                )}
              </div>
            </GlassCard>

            {/* RIGHT: Details + Pricing + Post */}
            <div className="space-y-4">

              {/* Step 2: Title & Description */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
                  <h3 className="text-base font-semibold text-white">Title & description</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Give your content a catchy title"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">
                      Description <span className="text-gray-500 font-normal text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what fans will get..."
                      rows={3}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Step 3: Pricing */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
                  <h3 className="text-base font-semibold text-white">Set pricing</h3>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isFree: true, unlockPrice: 0 })}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      formData.isFree
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    <Eye className={`w-5 h-5 mx-auto mb-1.5 ${formData.isFree ? 'text-green-400' : 'text-gray-400'}`} />
                    <div className="text-sm font-semibold text-white">Free</div>
                    <div className="text-xs text-gray-400">Everyone can view</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isFree: false, unlockPrice: formData.unlockPrice || 10 })}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      !formData.isFree
                        ? 'border-yellow-400 bg-yellow-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    <Lock className={`w-5 h-5 mx-auto mb-1.5 ${!formData.isFree ? 'text-yellow-400' : 'text-gray-400'}`} />
                    <div className="text-sm font-semibold text-white">Locked</div>
                    <div className="text-xs text-gray-400">Pay to unlock</div>
                  </button>
                </div>

                {!formData.isFree && (
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.unlockPrice === 0 ? '' : formData.unlockPrice.toString()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, unlockPrice: value === '' ? 0 : parseInt(value) });
                      }}
                      placeholder="Enter price"
                      className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-gray-300 text-sm">coins</span>
                  </div>
                )}
              </GlassCard>

              {/* Upload Progress */}
              {uploading && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Uploading video{uploadProgress > 0 && uploadProgress < 100 ? ' (auto-resumes if interrupted)' : ''}...</span>
                    <span className="text-cyan-400 font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Post */}
              <GlassButton
                type="submit"
                variant="gradient"
                disabled={uploading || generatingThumbnail || !formData.title || !hasContent}
                shimmer
                className="w-full"
                size="lg"
              >
                <span className="text-white font-semibold">
                  {uploading && uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading ${uploadProgress}%...`
                    : uploading
                      ? 'Posting...'
                      : generatingThumbnail
                        ? 'Generating thumbnail...'
                        : 'Post →'}
                </span>
              </GlassButton>

              {!hasContent && (
                <p className="text-xs text-gray-500 text-center">Upload a file on the left to enable posting</p>
              )}
            </div>

          </div>
        </form>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
