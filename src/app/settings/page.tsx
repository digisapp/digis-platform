'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { CheckCircle, XCircle, Loader2, User, AtSign, MessageSquare, AlertCircle, Upload, Image as ImageIcon, Mail, Calendar, Shield, Crown, Phone, Clock, DollarSign, ToggleLeft, ToggleRight, PhoneCall, Mic, Video, Settings, Star, Tag } from 'lucide-react';
import { validateUsername } from '@/lib/utils/username';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import { CREATOR_CATEGORIES } from '@/lib/constants/categories';
import { getNextTierProgress, getTierConfig, type SpendTier } from '@/lib/tiers/spend-tiers';
import { getCreatorNextTierProgress, getCreatorTierConfig, type CreatorTier } from '@/lib/tiers/creator-tiers';
import { COIN_TO_USD_RATE } from '@/lib/stripe/constants';

// Helper to format coins as USD
const formatCoinsToUSD = (coins: number): string => {
  const usd = coins * COIN_TO_USD_RATE;
  return usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

interface UsernameStatus {
  canChange: boolean;
  daysRemaining: number;
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

  // Email change
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

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
  const [savingCallSettings, setSavingCallSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Tab state for creator rates
  const [activeRateTab, setActiveRateTab] = useState<'video' | 'voice' | 'messages' | 'subscriptions'>('video');

  // Creator call settings
  const [callSettings, setCallSettings] = useState({
    callRatePerMinute: 10,
    minimumCallDuration: 5,
    voiceCallRatePerMinute: 5,
    minimumVoiceCallDuration: 5,
    messageRate: 0,
    isAvailableForCalls: true,
    isAvailableForVoiceCalls: true,
  });

  // Subscription settings
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    enabled: false,
    subscriptionName: 'Superfan',
    monthlyPrice: 50,
  });
  const [savingSubscriptionSettings, setSavingSubscriptionSettings] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchUsernameCooldown();
  }, []);

  // Fetch call settings after user is loaded
  useEffect(() => {
    if (currentUser?.role === 'creator') {
      fetchCallSettings();
    }
  }, [currentUser]);

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

  const fetchCallSettings = async () => {
    try {
      const response = await fetch('/api/creator/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setCallSettings({
            callRatePerMinute: data.settings.callRatePerMinute || 10,
            minimumCallDuration: data.settings.minimumCallDuration || 5,
            voiceCallRatePerMinute: data.settings.voiceCallRatePerMinute || 5,
            minimumVoiceCallDuration: data.settings.minimumVoiceCallDuration || 5,
            messageRate: data.settings.messageRate || 0,
            isAvailableForCalls: data.settings.isAvailableForCalls ?? true,
            isAvailableForVoiceCalls: data.settings.isAvailableForVoiceCalls ?? true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching call settings:', error);
    }
  };

  const saveCallSettings = async () => {
    setSavingCallSettings(true);
    try {
      const response = await fetch('/api/creator/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callSettings),
      });

      if (response.ok) {
        setMessage('Call settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save call settings');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error saving call settings:', error);
      setError('Failed to save call settings');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSavingCallSettings(false);
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
    try {
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

      setEmailVerificationSent(true);
    } catch (err: any) {
      throw new Error(`Email update failed: ${err.message}`);
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

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMessage('');
    setEmailError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if it's the same as current email
    if (newEmail.toLowerCase() === currentUser?.email?.toLowerCase()) {
      setEmailError('This is already your current email');
      return;
    }

    setSavingEmail(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Update email via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        throw error;
      }

      setEmailMessage('Verification email sent! Please check your inbox and confirm your new email address.');
      setNewEmail('');

      setTimeout(() => {
        setEmailMessage('');
      }, 5000);
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email');
      setTimeout(() => setEmailError(''), 5000);
    } finally {
      setSavingEmail(false);
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
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform">
                      {currentUser?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center border-4 border-white">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  {currentUser?.role === 'creator' && (
                    <div className="absolute -bottom-1 -right-1 p-1 bg-yellow-500 rounded-full border-2 border-white pointer-events-none">
                      <Crown className="w-3 h-3 text-white" />
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

          {/* Account Information */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                <div className="p-2 bg-gradient-to-br from-digis-purple to-digis-pink rounded-lg">
                  <AtSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Username</p>
                  <p className="text-sm font-medium text-white">{currentUser?.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                <div className={`p-2 bg-gradient-to-br ${currentUser?.role === 'creator' ? 'from-digis-pink to-purple-500' : 'from-digis-cyan to-blue-500'} rounded-lg`}>
                  {currentUser?.role === 'creator' ? (
                    <Crown className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Account Type</p>
                  <p className="text-sm font-medium text-white capitalize">{currentUser?.role}</p>
                </div>
              </div>

              {currentUser?.createdAt && (
                <div className="flex items-center gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-lg">
                  <div className="p-2 bg-gradient-to-br from-digis-purple to-digis-cyan rounded-lg">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Member Since</p>
                    <p className="text-sm font-medium text-white">
                      {new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

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
                            <span className="text-gray-400">{lifetimeTips.toLocaleString()} tips received</span>
                            <span className="text-gray-400">{progress.nextTier.minCoins.toLocaleString()} tips</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500`}
                              style={{ width: `${progress.progressPercent}%` }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          {progress.coinsToNext.toLocaleString()} tips until {progress.nextTier.emoji} {progress.nextTier.displayName}
                        </p>
                      </>
                    )}

                    {!progress.nextTier && (
                      <p className="text-xs text-gray-400">
                        Maximum status achieved! Total tips: {lifetimeTips.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </GlassCard>
        </div>

        {/* Section Divider */}
        <div className="border-t border-cyan-500/30/50 my-8" />

        {/* Username Section */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AtSign className="w-5 h-5 text-digis-purple" />
            <h2 className="text-xl font-semibold text-white">Username</h2>
          </div>

          {usernameCooldown && !usernameCooldown.canChange && (
            <p className="text-xs text-yellow-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              You can change your username again in {usernameCooldown.daysRemaining} day{usernameCooldown.daysRemaining !== 1 ? 's' : ''}
            </p>
          )}

          <form onSubmit={handleChangeUsername} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                disabled={!usernameCooldown?.canChange}
                placeholder={currentUser?.username}
                className={`w-full px-4 py-3 backdrop-blur-xl bg-white/5 border-2 rounded-lg text-white font-medium placeholder-gray-500 focus:outline-none transition-all ${
                  !newUsername || newUsername === currentUser?.username
                    ? 'border-cyan-500/30 focus:border-digis-cyan'
                    : usernameStatus === 'checking'
                    ? 'border-yellow-400'
                    : usernameStatus === 'available'
                    ? 'border-green-500 focus:border-green-500'
                    : 'border-red-500 focus:border-red-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />

              {/* Status Indicator */}
              {newUsername && newUsername !== currentUser?.username && (
                <div className="absolute right-3 top-3.5">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {usernameStatus === 'taken' && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              )}
            </div>

            {/* Only show button when username is different and available */}
            {newUsername && newUsername !== currentUser?.username && usernameStatus === 'available' && (
              <GlassButton
                type="submit"
                variant="gradient"
                disabled={savingUsername}
              >
                {savingUsername ? <LoadingSpinner size="sm" /> : 'Update'}
              </GlassButton>
            )}
          </form>
        </GlassCard>

        {/* Section Divider */}
        <div className="border-t border-cyan-500/30/50 my-8" />

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
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Primary Category
                  </label>
                  <select
                    className="w-full px-4 py-3 backdrop-blur-xl bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan focus:border-digis-cyan transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.3)]"
                    value={primaryCategory}
                    onChange={(e) => setPrimaryCategory(e.target.value)}
                  >
                    <option value="" className="bg-gray-900 text-gray-400">Select a category...</option>
                    {CREATOR_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-gray-900 text-white py-2">
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Main content category for discovery</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Secondary Category (Optional)
                  </label>
                  <select
                    className="w-full px-4 py-3 backdrop-blur-xl bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan focus:border-digis-cyan transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.3)]"
                    value={secondaryCategory}
                    onChange={(e) => setSecondaryCategory(e.target.value)}
                  >
                    <option value="" className="bg-gray-900 text-gray-400">None</option>
                    {CREATOR_CATEGORIES.filter(cat => cat.value !== primaryCategory).map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-gray-900 text-white py-2">
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
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

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full px-4 py-3 backdrop-blur-xl bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan focus:border-digis-cyan transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-500/50"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {currentUser?.email && email === currentUser.email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Changing your email will require verification
              </p>
            </div>

            <GlassButton
              type="submit"
              variant="gradient"
              disabled={saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save Profile'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Section Divider */}
        <div className="border-t border-cyan-500/30/50 my-8" />

        {/* Creator Rates & Availability - Creators Only */}
        {currentUser?.role === 'creator' && (
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-digis-pink" />
              <h2 className="text-xl font-semibold text-white">Rates & Subscriptions</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-cyan-500/30">
              <button
                onClick={() => setActiveRateTab('video')}
                className={`px-4 py-2 font-semibold text-sm transition-all relative ${
                  activeRateTab === 'video'
                    ? 'text-digis-cyan'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  Video Calls
                </div>
                {activeRateTab === 'video' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-digis-cyan" />
                )}
              </button>
              <button
                onClick={() => setActiveRateTab('voice')}
                className={`px-4 py-2 font-semibold text-sm transition-all relative ${
                  activeRateTab === 'voice'
                    ? 'text-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Voice Calls
                </div>
                {activeRateTab === 'voice' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
              <button
                onClick={() => setActiveRateTab('messages')}
                className={`px-4 py-2 font-semibold text-sm transition-all relative ${
                  activeRateTab === 'messages'
                    ? 'text-pink-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages
                </div>
                {activeRateTab === 'messages' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />
                )}
              </button>
              <button
                onClick={() => setActiveRateTab('subscriptions')}
                className={`px-4 py-2 font-semibold text-sm transition-all relative ${
                  activeRateTab === 'subscriptions'
                    ? 'text-purple-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Subscriptions
                </div>
                {activeRateTab === 'subscriptions' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                )}
              </button>
            </div>

            {/* Video Calls Tab Content */}
            {activeRateTab === 'video' && (
              <div className="space-y-6">
                {/* Availability Toggle */}
                <div className="flex items-center justify-between p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Phone className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Available for Video Calls</h3>
                      <p className="text-xs text-gray-400">Allow fans to request video calls</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCallSettings({ ...callSettings, isAvailableForCalls: !callSettings.isAvailableForCalls })}
                    className="p-1"
                  >
                    {callSettings.isAvailableForCalls ? (
                      <ToggleRight className="w-10 h-10 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Rate and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                    <label className="block text-sm font-semibold text-white mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Rate Per Minute
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={callSettings.callRatePerMinute}
                        onChange={(e) => setCallSettings({ ...callSettings, callRatePerMinute: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                      />
                      <span className="text-sm text-gray-400 whitespace-nowrap">coins/min</span>
                    </div>
                    <p className="text-xs text-green-400 mt-2 font-medium">
                      = {formatCoinsToUSD(callSettings.callRatePerMinute)}/min
                    </p>
                  </div>

                  <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                    <label className="block text-sm font-semibold text-white mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Minimum Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={callSettings.minimumCallDuration}
                        onChange={(e) => setCallSettings({ ...callSettings, minimumCallDuration: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                      />
                      <span className="text-sm text-gray-400 whitespace-nowrap">minutes</span>
                    </div>
                    <p className="text-xs text-green-400 mt-2 font-medium">
                      Min earnings: {formatCoinsToUSD(callSettings.callRatePerMinute * callSettings.minimumCallDuration)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Calls Tab Content */}
            {activeRateTab === 'voice' && (
              <div className="space-y-6">
                {/* Availability Toggle */}
                <div className="flex items-center justify-between p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Mic className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Available for Voice Calls</h3>
                      <p className="text-xs text-gray-400">Allow fans to request voice-only calls</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCallSettings({ ...callSettings, isAvailableForVoiceCalls: !callSettings.isAvailableForVoiceCalls })}
                    className="p-1"
                  >
                    {callSettings.isAvailableForVoiceCalls ? (
                      <ToggleRight className="w-10 h-10 text-blue-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Rate and Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                    <label className="block text-sm font-semibold text-white mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Rate Per Minute
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={callSettings.voiceCallRatePerMinute}
                        onChange={(e) => setCallSettings({ ...callSettings, voiceCallRatePerMinute: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                      />
                      <span className="text-sm text-gray-400 whitespace-nowrap">coins/min</span>
                    </div>
                    <p className="text-xs text-green-400 mt-2 font-medium">
                      = {formatCoinsToUSD(callSettings.voiceCallRatePerMinute)}/min
                    </p>
                  </div>

                  <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                    <label className="block text-sm font-semibold text-white mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Minimum Duration
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={callSettings.minimumVoiceCallDuration}
                        onChange={(e) => setCallSettings({ ...callSettings, minimumVoiceCallDuration: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                      />
                      <span className="text-sm text-gray-400 whitespace-nowrap">minutes</span>
                    </div>
                    <p className="text-xs text-green-400 mt-2 font-medium">
                      Min earnings: {formatCoinsToUSD(callSettings.voiceCallRatePerMinute * callSettings.minimumVoiceCallDuration)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Tab Content */}
            {activeRateTab === 'messages' && (
              <div className="space-y-6">
                <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                  <label className="block text-sm font-semibold text-white mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Cost Per Message
                  </label>
                  <p className="text-xs text-gray-400 mb-3">Set to 0 for free messages</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={callSettings.messageRate}
                      onChange={(e) => setCallSettings({ ...callSettings, messageRate: parseInt(e.target.value) || 0 })}
                      className="w-full md:w-64 px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-sm text-gray-400 whitespace-nowrap">coins/message</span>
                  </div>
                  <p className="text-xs text-green-400 mt-2 font-medium">
                    = {callSettings.messageRate === 0 ? 'Free' : `${formatCoinsToUSD(callSettings.messageRate)}/message`}
                  </p>
                </div>
              </div>
            )}

            {/* Subscriptions Tab Content */}
            {activeRateTab === 'subscriptions' && (
              <div className="space-y-6">
                {/* Enable Subscriptions Toggle */}
                <div className="flex items-center justify-between p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Star className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Enable Subscriptions</h3>
                      <p className="text-xs text-gray-400">Allow fans to subscribe to your exclusive content</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSubscriptionSettings({ ...subscriptionSettings, enabled: !subscriptionSettings.enabled })}
                    className="p-1"
                  >
                    {subscriptionSettings.enabled ? (
                      <ToggleRight className="w-10 h-10 text-purple-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Subscription Details - Only show when enabled */}
                {subscriptionSettings.enabled && (
                  <div className="space-y-4 border-t border-cyan-500/30 pt-6">
                    <h3 className="text-base font-bold text-white mb-4">Subscription Details</h3>

                    {/* Subscription Name */}
                    <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                      <label className="block text-sm font-semibold text-white mb-1">
                        Subscription Name <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-gray-400 mb-3">What your subscribers will be called</p>
                      <input
                        type="text"
                        value={subscriptionSettings.subscriptionName}
                        onChange={(e) => setSubscriptionSettings({ ...subscriptionSettings, subscriptionName: e.target.value })}
                        placeholder="Superfan"
                        maxLength={30}
                        className="w-full px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                      />
                    </div>

                    {/* Monthly Price */}
                    <div className="p-4 backdrop-blur-xl bg-white/5 rounded-xl">
                      <label className="block text-sm font-semibold text-white mb-1">
                        Monthly Price <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2 mt-3">
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={subscriptionSettings.monthlyPrice}
                          onChange={(e) => setSubscriptionSettings({ ...subscriptionSettings, monthlyPrice: parseInt(e.target.value) || 1 })}
                          className="w-full md:w-64 px-4 py-2 bg-black/40 border-2 border-cyan-500/30 rounded-lg text-white font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                        />
                        <span className="text-sm text-gray-400 whitespace-nowrap">coins/month</span>
                      </div>
                      <p className="text-xs text-green-400 mt-2 font-medium">
                        = {formatCoinsToUSD(subscriptionSettings.monthlyPrice)}/month
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-cyan-500/30">
              <GlassButton
                variant="gradient"
                onClick={saveCallSettings}
                disabled={savingCallSettings}
                shimmer
                className="w-full"
              >
                {savingCallSettings ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Settings'
                )}
              </GlassButton>
            </div>
          </GlassCard>
        )}

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
              onClick={() => router.push('/creator/apply')}
              className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold text-white hover:scale-105 transition-transform"
            >
              Apply to Become a Creator
            </button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
