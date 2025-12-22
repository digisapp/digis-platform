'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { CheckCircle, XCircle, Loader2, User, AtSign, MessageSquare, AlertCircle, Upload, Image as ImageIcon, Mail, Calendar, Shield, Crown, Star, Tag, Share2, Instagram, Youtube } from 'lucide-react';
import { validateUsername } from '@/lib/utils/username';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import { CREATOR_CATEGORIES } from '@/lib/constants/categories';
import { getNextTierProgress, getTierConfig, type SpendTier } from '@/lib/tiers/spend-tiers';
import { getCreatorNextTierProgress, getCreatorTierConfig, type CreatorTier } from '@/lib/tiers/creator-tiers';
import { ShareDigisCard } from '@/components/share/ShareDigisCard';

interface UsernameStatus {
  canChange: boolean;
  daysRemaining: number;
  changesUsed: number;
  changesRemaining: number;
  maxChanges: number;
  currentUsername: string;
  lastChangedAt: string | null;
}

export default function SettingsPage() {
  const router = useRouter();

  // User data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [secondaryCategory, setSecondaryCategory] = useState('');

  // Social media handles
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [snapchatHandle, setSnapchatHandle] = useState('');
  const [youtubeHandle, setYoutubeHandle] = useState('');
  const [showSocialLinks, setShowSocialLinks] = useState(true);

  // Email change
  const [email, setEmail] = useState('');

  // Image upload states
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [bannerPreview, setBannerPreview] = useState<string | undefined>();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Username change
  const [newUsername, setNewUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [usernameCooldown, setUsernameCooldown] = useState<UsernameStatus | null>(null);

  // Save states
  const [saving, setSaving] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Category dropdown states
  const [showPrimaryCategoryDropdown, setShowPrimaryCategoryDropdown] = useState(false);
  const [showSecondaryCategoryDropdown, setShowSecondaryCategoryDropdown] = useState(false);

  useEffect(() => {
    // Fetch all data in parallel to avoid waterfall
    Promise.all([
      fetchCurrentUser(),
      fetchUsernameCooldown(),
    ]);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();

      if (!response.ok) {
        // Only redirect if actually unauthorized, not on other errors
        if (response.status === 401) {
          router.push('/');
          return;
        }
        // For other errors, show error but don't redirect
        console.error('Error loading user data:', data.error);
        setError(data.error || 'Failed to load user data');
        setLoading(false);
        return;
      }

      setCurrentUser(data);
      setDisplayName(data.displayName || '');
      setBio(data.bio || '');
      setCity(data.profile?.city || '');
      setState(data.profile?.state || '');
      setPhoneNumber(data.profile?.phoneNumber || '');
      setAvatarUrl(data.avatarUrl || '');
      setBannerUrl(data.bannerUrl || '');
      setNewUsername(data.username || '');
      setPrimaryCategory(data.primaryCategory || '');
      setSecondaryCategory(data.secondaryCategory || '');
      setEmail(data.email || '');
      // Social media handles
      setInstagramHandle(data.profile?.instagramHandle || '');
      setTiktokHandle(data.profile?.tiktokHandle || '');
      setTwitterHandle(data.profile?.twitterHandle || '');
      setSnapchatHandle(data.profile?.snapchatHandle || '');
      setYoutubeHandle(data.profile?.youtubeHandle || '');
      setShowSocialLinks(data.profile?.showSocialLinks ?? true);
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.message);
      // Don't redirect on fetch errors - user might be logged in but API is slow
    } finally {
      setLoading(false);
    }
  };

  const fetchUsernameCooldown = async () => {
    try {
      const response = await fetch('/api/user/update-username');
      const data = await response.json();

      if (response.ok) {
        setUsernameCooldown(data);
      }
    } catch (err) {
      console.error('Error fetching username cooldown:', err);
    }
  };

  // Check username availability with debouncing
  useEffect(() => {
    if (!newUsername || newUsername.length < 3) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    // Check if it's the same as current username
    if (newUsername.toLowerCase() === currentUser?.username?.toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameError('This is already your current username');
      return;
    }

    // Validate format first
    const validation = validateUsername(newUsername);
    if (!validation.valid) {
      setUsernameStatus('idle');
      setUsernameError(validation.error || '');
      return;
    }

    setUsernameError('');
    setUsernameStatus('checking');

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(newUsername)}`);
        const data = await response.json();

        if (data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
          setUsernameError('Username is already taken');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [newUsername, currentUser]);

  const handleEmailChange = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    // Use Supabase Auth to update email with verification
    const response = await fetch('/api/user/update-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail: email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update email');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      // Check if email has changed
      const emailChanged = email !== currentUser?.email;

      if (emailChanged) {
        // Handle email change with verification
        await handleEmailChange();
      }

      // Update other profile fields
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          city,
          state,
          phoneNumber,
          avatarUrl,
          bannerUrl,
          primaryCategory: primaryCategory || null,
          secondaryCategory: secondaryCategory || null,
          // Social media handles
          instagramHandle: instagramHandle || null,
          tiktokHandle: tiktokHandle || null,
          twitterHandle: twitterHandle || null,
          snapchatHandle: snapchatHandle || null,
          youtubeHandle: youtubeHandle || null,
          showSocialLinks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (emailChanged) {
        setMessage('Profile updated! Please check your new email address to verify the change.');
      } else {
        setMessage('Profile updated successfully!');
      }
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (usernameStatus !== 'available') {
      setError('Please choose an available username');
      return;
    }

    setSavingUsername(true);

    try {
      const response = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update username');
      }

      setMessage(data.message);
      setNewUsername('');
      setUsernameStatus('idle');

      // Refresh cooldown status
      await fetchUsernameCooldown();

      // Refresh user data
      await fetchCurrentUser();

      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingUsername(false);
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

      // Save to database
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save avatar');
      }

      setAvatarUrl(url);
      setMessage('Avatar updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file
    const validation = validateImageFile(file, 'banner');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingBanner(true);
    setError('');

    try {
      // Resize image to max 1920 width, 500 height
      const resizedFile = await resizeImage(file, 1920, 500);

      // Upload to Supabase Storage
      const url = await uploadImage(resizedFile, 'banner', currentUser.id);

      // Update preview
      setBannerPreview(url);

      // Save to database
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerUrl: url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save banner');
      }

      setBannerUrl(url);
      setMessage('Banner updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Banner upload error:', err);
      setError(err.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 pt-4 md:py-12 px-4 pb-24 md:pb-8 relative overflow-hidden">
      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Global Messages */}
        {message && (
          <div className="glass p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500 text-green-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium">{message}</span>
          </div>
        )}

        {error && (
          <div className="glass p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border-2 border-red-500 text-red-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Profile Media & Account Info Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Media */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-digis-cyan" />
              Profile Media
            </h3>
            <div className="space-y-4">
              {/* Banner Preview - Clickable - Creators Only */}
              {currentUser?.role === 'creator' && (
                <label className="relative h-32 rounded-lg overflow-hidden bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 cursor-pointer group block">
                  {(bannerPreview || bannerUrl) ? (
                    <>
                      <img src={bannerPreview || bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      {/* Persistent upload badge */}
                      <div className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1.5 text-white/80 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                        <Upload className="w-4 h-4" />
                        <span className="text-xs font-medium">Edit</span>
                      </div>
                      {/* Full overlay on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-center">
                          <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                          <p className="text-xs text-white font-medium">Change Banner</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 group-hover:text-digis-pink transition-colors">
                      <Upload className="w-8 h-8 mb-2" />
                      <p className="text-sm font-medium">Click to add banner</p>
                    </div>
                  )}
                  {uploadingBanner && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                </label>
              )}

              {/* Avatar & Info */}
              <div className={`flex items-start gap-4 relative z-10 px-4 ${currentUser?.role === 'creator' ? '-mt-12' : ''}`}>
                {/* Avatar - Clickable */}
                <label className="relative cursor-pointer group flex-shrink-0">
                  {(avatarPreview || avatarUrl) ? (
                    <>
                      <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      {/* Persistent camera badge */}
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-cyan-500 rounded-full border-2 border-white group-hover:bg-cyan-400 transition-colors">
                        <Upload className="w-3 h-3 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform">
                        {currentUser?.username?.[0]?.toUpperCase()}
                      </div>
                      {/* Persistent camera badge for empty avatar */}
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-cyan-500 rounded-full border-2 border-white group-hover:bg-cyan-400 transition-colors">
                        <Upload className="w-3 h-3 text-white" />
                      </div>
                    </>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center border-4 border-white">
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

                {/* Name & Bio */}
                <div className="flex-1 mt-6">
                  <h4 className="font-bold text-white text-lg">{displayName || 'Your Name'}</h4>
                  <p className="text-sm text-gray-400">@{currentUser?.username}</p>
                  {bio && (
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">{bio}</p>
                  )}
                </div>

              </div>
            </div>
          </GlassCard>

          {/* Account Settings */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Account Settings
            </h3>
            <div className="space-y-4">
              {/* Username - Editable */}
              <div className="p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AtSign className="w-4 h-4 text-digis-purple" />
                  <p className="text-xs text-gray-400">Username</p>
                </div>
                {usernameCooldown && !usernameCooldown.canChange ? (
                  <p className="text-xs text-yellow-300 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Can change in {usernameCooldown.daysRemaining} day{usernameCooldown.daysRemaining !== 1 ? 's' : ''}
                  </p>
                ) : usernameCooldown && (
                  <p className="text-xs text-gray-400 mb-2">
                    {usernameCooldown.changesRemaining} of {usernameCooldown.maxChanges} changes left this month
                  </p>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    disabled={usernameCooldown?.canChange === false}
                    placeholder={currentUser?.username}
                    className={`w-full px-3 py-2 bg-black/30 border rounded-lg text-white text-sm font-medium placeholder-gray-500 focus:outline-none transition-all ${
                      !newUsername || newUsername === currentUser?.username
                        ? 'border-white/10 focus:border-digis-cyan'
                        : usernameStatus === 'checking'
                        ? 'border-yellow-400'
                        : usernameStatus === 'available'
                        ? 'border-green-500'
                        : 'border-red-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {newUsername && newUsername !== currentUser?.username && (
                    <div className="absolute right-2 top-2">
                      {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
                      {usernameStatus === 'available' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {usernameStatus === 'taken' && <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                  )}
                </div>
                {newUsername && newUsername !== currentUser?.username && usernameStatus === 'available' && (
                  <button
                    type="button"
                    onClick={handleChangeUsername}
                    disabled={savingUsername}
                    className="mt-2 px-3 py-1.5 bg-gradient-to-r from-digis-cyan to-digis-purple text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {savingUsername ? 'Saving...' : 'Update Username'}
                  </button>
                )}
              </div>

              {/* Email - Editable */}
              <div className="p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-digis-cyan" />
                  <p className="text-xs text-gray-400">Email Address</p>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-digis-cyan transition-all"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {currentUser?.email && email === currentUser.email && (
                    <span className="absolute right-2 top-2 text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                    </span>
                  )}
                </div>
                {email !== currentUser?.email && (
                  <p className="text-xs text-yellow-400 mt-1">Click "Save Profile" below to receive a verification email</p>
                )}
              </div>

              {/* Account Type & Member Since - Read Only */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                  <div className={`p-1.5 bg-gradient-to-br ${currentUser?.role === 'creator' ? 'from-digis-pink to-purple-500' : 'from-digis-cyan to-blue-500'} rounded-md`}>
                    {currentUser?.role === 'creator' ? (
                      <Crown className="w-3 h-3 text-white" />
                    ) : (
                      <User className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Type</p>
                    <p className="text-sm font-medium text-white capitalize">{currentUser?.role}</p>
                  </div>
                </div>

                {currentUser?.createdAt && (
                  <div className="flex items-center gap-2 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                    <div className="p-1.5 bg-gradient-to-br from-digis-purple to-digis-cyan rounded-md">
                      <Calendar className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Joined</p>
                      <p className="text-sm font-medium text-white">
                        {new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Spend Tier Progress - Fans Only */}
              {currentUser?.role === 'fan' && (() => {
                const lifetimeSpending = currentUser?.lifetimeSpending || 0;
                const spendTier = currentUser?.spendTier || 'none';
                const progress = getNextTierProgress(lifetimeSpending);
                const currentTierConfig = getTierConfig(spendTier as SpendTier);

                return (
                  <div className="p-4 backdrop-blur-xl bg-white/5 rounded-lg border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-digis-cyan" />
                        <p className="text-xs text-gray-400">Spend Tier</p>
                      </div>
                      <p className={`text-sm font-bold ${currentTierConfig.color}`}>
                        {currentTierConfig.emoji && `${currentTierConfig.emoji} `}{currentTierConfig.displayName}
                      </p>
                    </div>

                    {progress.nextTier && (
                      <>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{lifetimeSpending.toLocaleString()} coins</span>
                            <span className="text-gray-400">{progress.nextTier.minCoins.toLocaleString()} coins</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-digis-cyan to-digis-pink transition-all duration-500"
                              style={{ width: `${progress.progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          {progress.coinsToNext.toLocaleString()} coins until {progress.nextTier.emoji} {progress.nextTier.displayName}
                        </p>
                      </>
                    )}

                    {!progress.nextTier && (
                      <p className="text-xs text-gray-400">
                        Maximum tier achieved! Total: {lifetimeSpending.toLocaleString()} coins
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Creator Tier Progress - Creators Only */}
              {currentUser?.role === 'creator' && (() => {
                const lifetimeTips = currentUser?.lifetimeTipsReceived || 0;
                const progress = getCreatorNextTierProgress(lifetimeTips);
                const currentTierConfig = progress.currentTier;

                return (
                  <div className={`p-4 backdrop-blur-xl bg-gradient-to-br ${currentTierConfig.bgColor} rounded-lg border border-cyan-500/20`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <p className="text-xs text-gray-400">Creator Status</p>
                      </div>
                      <p className={`text-sm font-bold ${currentTierConfig.color}`}>
                        {currentTierConfig.emoji} {currentTierConfig.displayName}
                      </p>
                    </div>

                    {progress.nextTier && (
                      <>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{lifetimeTips.toLocaleString()} coins received</span>
                            <span className="text-gray-400">{progress.nextTier.minCoins.toLocaleString()} coins</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500`}
                              style={{ width: `${progress.progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          {progress.coinsToNext.toLocaleString()} coins until {progress.nextTier.emoji} {progress.nextTier.displayName}
                        </p>
                      </>
                    )}

                    {!progress.nextTier && (
                      <p className="text-xs text-gray-400">
                        Maximum status achieved! Total coins: {lifetimeTips.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </GlassCard>
        </div>

        {/* Share Your Digis Section - Creators Only */}
        {currentUser?.role === 'creator' && (
          <>
            <div className="border-t border-cyan-500/30 my-8" />

            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Share2 className="w-5 h-5 text-digis-cyan" />
                <h2 className="text-xl font-semibold text-white">Share Your Digis</h2>
              </div>
              <ShareDigisCard
                username={currentUser.username || ''}
                displayName={currentUser.displayName || undefined}
                profileImage={currentUser.avatarUrl}
                bio={currentUser.bio}
              />
            </GlassCard>
          </>
        )}

        {/* Section Divider */}
        <div className="border-t border-cyan-500/30 my-8" />

        {/* Profile Information Section */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-digis-pink" />
            <h2 className="text-xl font-semibold text-white">Profile Information</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <GlassInput
              type="text"
              label="Display Name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Bio
              </label>
              <textarea
                className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-digis-cyan/50 backdrop-blur-sm resize-none"
                placeholder="Tell us about yourself..."
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{bio.length}/200 characters</p>
            </div>

            {/* Category selectors - Only for creators */}
            {currentUser?.role === 'creator' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Primary Category */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Primary Category
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPrimaryCategoryDropdown(!showPrimaryCategoryDropdown);
                        setShowSecondaryCategoryDropdown(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between ${
                        primaryCategory
                          ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                          : 'bg-white/5 border-2 border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {primaryCategory ? (
                          <>
                            <span className="text-xl">{CREATOR_CATEGORIES.find(c => c.value === primaryCategory)?.emoji}</span>
                            <span className="text-white font-medium">{CREATOR_CATEGORIES.find(c => c.value === primaryCategory)?.label}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Select a category...</span>
                        )}
                      </span>
                      <svg
                        className={`w-5 h-5 text-cyan-400 transition-transform duration-200 ${showPrimaryCategoryDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showPrimaryCategoryDropdown && (
                      <div className="absolute z-50 w-full mt-2 py-2 bg-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.2)] max-h-64 overflow-y-auto">
                        {CREATOR_CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              setPrimaryCategory(cat.value);
                              setShowPrimaryCategoryDropdown(false);
                              // Clear secondary if it matches primary
                              if (secondaryCategory === cat.value) {
                                setSecondaryCategory('');
                              }
                            }}
                            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                              primaryCategory === cat.value
                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                                : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                            }`}
                          >
                            <span className="text-xl">{cat.emoji}</span>
                            <span className="font-medium">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Main content category for discovery</p>
                </div>

                {/* Secondary Category */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Secondary Category (Optional)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSecondaryCategoryDropdown(!showSecondaryCategoryDropdown);
                        setShowPrimaryCategoryDropdown(false);
                      }}
                      className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between ${
                        secondaryCategory
                          ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                          : 'bg-white/5 border-2 border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {secondaryCategory ? (
                          <>
                            <span className="text-xl">{CREATOR_CATEGORIES.find(c => c.value === secondaryCategory)?.emoji}</span>
                            <span className="text-white font-medium">{CREATOR_CATEGORIES.find(c => c.value === secondaryCategory)?.label}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </span>
                      <svg
                        className={`w-5 h-5 text-cyan-400 transition-transform duration-200 ${showSecondaryCategoryDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showSecondaryCategoryDropdown && (
                      <div className="absolute z-50 w-full mt-2 py-2 bg-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.2)] max-h-64 overflow-y-auto">
                        {/* None option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSecondaryCategory('');
                            setShowSecondaryCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                            !secondaryCategory
                              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                              : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                          }`}
                        >
                          <span className="text-xl">-</span>
                          <span className="font-medium">None</span>
                        </button>
                        {CREATOR_CATEGORIES.filter(cat => cat.value !== primaryCategory).map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              setSecondaryCategory(cat.value);
                              setShowSecondaryCategoryDropdown(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                              secondaryCategory === cat.value
                                ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                                : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                            }`}
                          >
                            <span className="text-xl">{cat.emoji}</span>
                            <span className="font-medium">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Additional content category</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassInput
                type="text"
                label="City"
                placeholder="Los Angeles"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <GlassInput
                type="text"
                label="State"
                placeholder="California"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <GlassInput
              type="tel"
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />

            {/* Social Media Section - Creators Only */}
            {currentUser?.role === 'creator' && (
              <div className="pt-6 border-t border-cyan-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-digis-purple" />
                    Social Media
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-400">Show on profile</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={showSocialLinks}
                        onChange={(e) => setShowSocialLinks(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-digis-cyan peer-checked:to-digis-purple transition-all"></div>
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
                    </div>
                  </label>
                </div>
                <p className="text-sm text-gray-400 mb-4">Add your social media profiles. Links will appear as icons on your public profile.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-pink-500" />
                      Instagram
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value.replace(/^@/, ''))}
                        className="w-full pl-8 pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      />
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={tiktokHandle}
                        onChange={(e) => setTiktokHandle(e.target.value.replace(/^@/, ''))}
                        className="w-full pl-8 pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>
                  </div>

                  {/* X (Twitter) */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      X (Twitter)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={twitterHandle}
                        onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ''))}
                        className="w-full pl-8 pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                      />
                    </div>
                  </div>

                  {/* Snapchat */}
                  <div className="relative">
                    <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.809-.329-1.224-.72-1.227-1.153-.015-.36.27-.69.72-.854.149-.06.314-.09.494-.09.12 0 .284.015.435.09.375.18.72.3 1.034.3.21 0 .314-.044.389-.074-.007-.18-.022-.345-.029-.525l-.006-.061c-.105-1.627-.225-3.654.3-4.848C7.849 1.069 11.205.793 12.191.793h.03z"/>
                      </svg>
                      Snapchat
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={snapchatHandle}
                        onChange={(e) => setSnapchatHandle(e.target.value.replace(/^@/, ''))}
                        className="w-full pl-8 pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                      />
                    </div>
                  </div>

                  {/* YouTube */}
                  <div className="relative md:col-span-2">
                    <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                      <Youtube className="w-4 h-4 text-red-500" />
                      YouTube
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                      <input
                        type="text"
                        placeholder="channel"
                        value={youtubeHandle}
                        onChange={(e) => setYoutubeHandle(e.target.value.replace(/^@/, ''))}
                        className="w-full pl-8 pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <GlassButton
              type="submit"
              variant="gradient"
              disabled={saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save Profile'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Become Creator Section - Only for Fans */}
        {currentUser?.role === 'fan' && (
          <GlassCard className="p-6 border-digis-cyan/20">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-digis-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">Become a Creator</h2>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Join our community of creators and start earning from your content, live shows, and more.
            </p>
            <button
              type="button"
              onClick={() => router.push('/creator/apply')}
              className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold text-white hover:scale-105 transition-transform"
            >
              Apply to Become a Creator
            </button>
          </GlassCard>
        )}

        {/* Support */}
        <div className="text-center py-4">
          <span className="text-gray-400">Contact Support: </span>
          <a
            href="mailto:support@digis.cc?subject=Digis Support Request"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            support@digis.cc
          </a>
        </div>

        {/* Sign Out Section */}
        <div className="border-t border-cyan-500/30 pt-8 mt-4">
          <button
            type="button"
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                if (response.ok) {
                  router.push('/');
                  router.refresh();
                }
              } catch (err) {
                console.error('Logout error:', err);
              }
            }}
            className="w-full px-6 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-semibold flex items-center justify-center gap-3 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
