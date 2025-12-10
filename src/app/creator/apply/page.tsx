'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Clock, Instagram, Camera, Upload, Bell, Home, Music2 } from 'lucide-react';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';

export default function CreatorApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Avatar upload states
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    instagramHandle: '',
    tiktokHandle: '',
    ageConfirmed: false,
    termsAccepted: false,
  });

  useEffect(() => {
    checkExistingApplication();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data);
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/creator/apply');
      const data = await response.json();

      if (response.ok && data.application) {
        setExistingApplication(data.application);
      }
    } catch (err) {
      console.error('Error checking application:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file
    const validation = validateImageFile(file, 'avatar');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      // Resize image to 512x512
      const resizedFile = await resizeImage(file, 512, 512);

      // Upload to Supabase Storage
      const url = await uploadImage(resizedFile, 'avatar', currentUser.id);

      // Update preview
      setAvatarPreview(url);

      // Save to user's profile immediately
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile picture');
      }

      setAvatarUrl(url);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/creator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccess(true);
      // Store the submitted application data for display
      setExistingApplication({
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>

            <div className="relative">
              {existingApplication.status === 'pending' && (
                <>
                  <div className="relative inline-block mb-6">
                    <div className="absolute -inset-2 bg-yellow-500/30 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                      <Clock className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Application Pending</h2>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Your creator application is currently under review. We'll notify you once it's been reviewed.
                  </p>
                  <div className="text-left mt-6 p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-2xl">
                    <p className="text-sm text-gray-400">Submitted: {new Date(existingApplication.createdAt).toLocaleDateString()}</p>
                  </div>
                </>
              )}
              {existingApplication.status === 'approved' && (
                <>
                  <div className="relative inline-block mb-6">
                    <div className="absolute -inset-2 bg-green-500/30 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">You're Already a Creator!</h2>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Your application has been approved. You can start creating content now.
                  </p>
                  <button
                    onClick={() => router.push('/creator/dashboard')}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                  >
                    Go to Creator Dashboard
                  </button>
                </>
              )}
              {existingApplication.status === 'rejected' && (
                <>
                  <div className="relative inline-block mb-6">
                    <div className="absolute -inset-2 bg-red-500/30 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                      <XCircle className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Application Not Approved</h2>
                  <p className="text-gray-400 mb-4 max-w-md mx-auto">
                    Unfortunately, your previous application was not approved.
                  </p>
                  {existingApplication.rejectionReason && (
                    <div className="text-left mt-4 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
                      <p className="text-sm text-red-400"><strong className="text-red-300">Reason:</strong> {existingApplication.rejectionReason}</p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-6">
                    You can submit a new application below.
                  </p>
                  <button
                    onClick={() => setExistingApplication(null)}
                    className="mt-4 px-6 py-3 bg-white/5 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors font-semibold"
                  >
                    Apply Again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message - comprehensive application submitted page
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 top-1/3 right-10 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="max-w-lg mx-auto relative z-10">
          {/* Success Card */}
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-green-500/30 p-8 text-center shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            {/* Confetti-like decoration */}
            <div className="absolute top-4 left-4 text-2xl animate-bounce" style={{animationDelay: '0s'}}>🎉</div>
            <div className="absolute top-6 right-6 text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>✨</div>
            <div className="absolute top-12 left-12 text-xl animate-bounce" style={{animationDelay: '0.4s'}}>🌟</div>

            <div className="relative inline-block mb-6">
              <div className="absolute -inset-3 bg-green-500/30 rounded-full blur-xl animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white via-green-100 to-white bg-clip-text text-transparent">
              Application Submitted!
            </h2>
            <p className="text-gray-300 text-lg mb-2">
              You're one step closer to becoming a creator
            </p>
            <p className="text-gray-500 text-sm">
              Submitted just now
            </p>
          </div>

          {/* What Happens Next */}
          <div className="mt-6 backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/20 p-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              What Happens Next?
            </h3>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">1</div>
                <div>
                  <p className="text-white font-medium">We review your application</p>
                  <p className="text-gray-400 text-sm">Usually within 24-48 hours</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">2</div>
                <div>
                  <p className="text-white font-medium">You'll get notified</p>
                  <p className="text-gray-400 text-sm">Check back here or wait for an email</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">3</div>
                <div>
                  <p className="text-white font-medium">Start creating!</p>
                  <p className="text-gray-400 text-sm">Go live, post content, earn money</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/live')}
              className="flex-1 px-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Explore Digis
            </button>
            <button
              onClick={() => setSuccess(false)}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/30 rounded-2xl font-semibold text-white hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2"
            >
              <Bell className="w-5 h-5" />
              Check Status
            </button>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Bookmark this page to check your application status anytime
          </p>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
            Become a Creator
          </h1>
        </div>

        {/* Form Card */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 p-8 shadow-[0_0_50px_rgba(34,211,238,0.2)]">
          {/* Animated gradient border effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center pb-6 border-b border-white/10">
              <label className="block text-sm font-semibold mb-4 text-white text-center">
                <Camera className="w-4 h-4 inline mr-1" />
                Profile Picture
              </label>
              <label className="relative cursor-pointer group">
                {(avatarPreview || avatarUrl) ? (
                  <>
                    <img
                      src={avatarPreview || avatarUrl}
                      alt="Profile"
                      className="w-28 h-28 rounded-full border-4 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                        <span className="text-xs text-white font-medium">Change</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-28 h-28 rounded-full border-4 border-dashed border-cyan-500/50 bg-white/5 flex flex-col items-center justify-center text-gray-400 group-hover:border-cyan-500 group-hover:text-cyan-400 transition-all">
                    <Camera className="w-8 h-8 mb-1" />
                    <span className="text-xs font-medium">Add Photo</span>
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center border-4 border-cyan-500/50">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            {/* Social Links Section */}
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-bold mb-4 text-white">Social Links <span className="text-sm font-normal text-gray-400">(optional)</span></h3>
              <div className="space-y-4">
                {/* Instagram */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.instagramHandle}
                    onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  />
                </div>

                {/* TikTok */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300 flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-cyan-400" />
                    TikTok
                  </label>
                  <input
                    type="text"
                    value={formData.tiktokHandle}
                    onChange={(e) => setFormData({ ...formData, tiktokHandle: e.target.value })}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Age Confirmation & Terms */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              {/* Age Confirmation */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={formData.ageConfirmed}
                    onChange={(e) => setFormData({ ...formData, ageConfirmed: e.target.checked })}
                    required
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-white/20 rounded bg-white/5 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  I confirm that I am <strong className="text-white">18 years of age or older</strong> <span className="text-cyan-400">*</span>
                </span>
              </label>

              {/* Terms Agreement */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    required
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-white/20 rounded bg-white/5 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-all flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  I agree to the <a href="/terms" target="_blank" className="text-cyan-400 hover:underline">Creator Terms of Service</a> and <a href="/privacy" target="_blank" className="text-cyan-400 hover:underline">Privacy Policy</a> <span className="text-cyan-400">*</span>
                </span>
              </label>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : 'Submit Application'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              We'll review your application and notify you within 24-48 hours
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
