'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Loader2, User, AtSign, MessageSquare, AlertCircle, Upload, Image as ImageIcon, Mail, Calendar, Shield, Crown, Phone, Clock, DollarSign, ToggleLeft, ToggleRight, PhoneCall, Mic } from 'lucide-react';
import { validateUsername } from '@/lib/utils/username';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';

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
  const [creatorCardImageUrl, setCreatorCardImageUrl] = useState('');

  // Image upload states
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [bannerPreview, setBannerPreview] = useState<string | undefined>();
  const [creatorCardPreview, setCreatorCardPreview] = useState<string | undefined>();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingCreatorCard, setUploadingCreatorCard] = useState(false);

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
      setCreatorCardImageUrl(data.creatorCardImageUrl || '');
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
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
          creatorCardImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
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

  const handleCreatorCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file
    const validation = validateImageFile(file, 'creator-card');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingCreatorCard(true);
    setError('');

    try {
      // Resize image to 4:5 portrait ratio (800x1000)
      const resizedFile = await resizeImage(file, 800, 1000);

      // Upload to Supabase Storage
      const url = await uploadImage(resizedFile, 'creator-card', currentUser.id);

      // Update preview
      setCreatorCardPreview(url);

      // Save to database
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorCardImageUrl: url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save creator card');
      }

      setCreatorCardImageUrl(url);
      setMessage('Creator card updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Creator card upload error:', err);
      setError(err.message || 'Failed to upload creator card');
    } finally {
      setUploadingCreatorCard(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient md:pl-20 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Global Messages */}
        {message && (
          <div className="glass p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500 text-green-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium">{message}</span>
          </div>
        )}

        {error && (
          <div className="glass p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border-2 border-red-500 text-red-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-digis-cyan" />
              Profile Media
            </h3>
            <div className="space-y-4">
              {/* Banner Preview - Clickable */}
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

              {/* Avatar & Info */}
              <div className="flex items-start gap-4 -mt-12 relative z-10 px-4">
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
                  <h4 className="font-bold text-gray-800 text-lg">{displayName || 'Your Name'}</h4>
                  <p className="text-sm text-gray-600">@{currentUser?.username}</p>
                  {bio && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{bio}</p>
                  )}
                </div>

                {/* Creator Card Mini Preview - Clickable - Creators Only */}
                {currentUser?.role === 'creator' && (
                  <div className="flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-600 mb-2 text-center">Creator Card</p>
                    <label className="relative cursor-pointer group block w-24">
                      {(creatorCardPreview || creatorCardImageUrl) ? (
                        <>
                          <img
                            src={creatorCardPreview || creatorCardImageUrl}
                            alt="Creator Card"
                            className="w-24 aspect-[4/5] object-cover rounded-xl border-2 border-purple-200 group-hover:border-digis-purple transition-all shadow-md"
                          />
                          <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-24 aspect-[4/5] rounded-xl border-2 border-dashed border-purple-200 group-hover:border-digis-purple transition-all flex flex-col items-center justify-center bg-white/50">
                          <Upload className="w-4 h-4 text-gray-400 group-hover:text-digis-purple transition-colors mb-1" />
                          <p className="text-[10px] text-gray-500 text-center px-1">Add Card</p>
                        </div>
                      )}
                      {uploadingCreatorCard && (
                        <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCreatorCardUpload}
                        disabled={uploadingCreatorCard}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Account Information */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-digis-pink" />
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Email Address</p>
                  <p className="text-sm font-medium text-gray-800">{currentUser?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <AtSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Username</p>
                  <p className="text-sm font-medium text-gray-800">@{currentUser?.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                <div className={`p-2 bg-gradient-to-br ${currentUser?.role === 'creator' ? 'from-yellow-500 to-amber-500' : 'from-green-500 to-emerald-500'} rounded-lg`}>
                  {currentUser?.role === 'creator' ? (
                    <Crown className="w-4 h-4 text-white" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600">Account Type</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{currentUser?.role}</p>
                </div>
              </div>

              {currentUser?.createdAt && (
                <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                  <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg">
                    <Calendar className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Member Since</p>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Username Change Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AtSign className="w-5 h-5 text-digis-cyan" />
              <h2 className="text-xl font-semibold text-gray-800">Change Username</h2>
            </div>
            <p className="text-sm text-gray-600">
              Current: <span className="text-gray-900 font-semibold">@{currentUser?.username}</span>
            </p>
          </div>

          {usernameCooldown && !usernameCooldown.canChange && (
            <p className="text-xs text-yellow-700 mb-3 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Available in {usernameCooldown.daysRemaining} day{usernameCooldown.daysRemaining !== 1 ? 's' : ''}
            </p>
          )}

          <form onSubmit={handleChangeUsername} className="space-y-3">
            <div className="relative">
              <GlassInput
                type="text"
                label="New Username"
                placeholder="yournewhandle"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                disabled={!usernameCooldown?.canChange}
              />

              {/* Status Indicator */}
              {newUsername && (
                <div className="absolute right-3 top-9">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
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

            {/* Username Error or Success */}
            {usernameError && (
              <p className="text-sm text-red-600">{usernameError}</p>
            )}
            {usernameStatus === 'available' && (
              <p className="text-sm text-green-600">@{newUsername} is available!</p>
            )}

            <GlassButton
              type="submit"
              variant="gradient"
              disabled={!usernameCooldown?.canChange || usernameStatus !== 'available' || savingUsername}
            >
              {savingUsername ? <LoadingSpinner size="sm" /> : 'Update Username'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Profile Information Section */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-digis-pink" />
            <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>
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
              <label className="block text-sm font-medium mb-2 text-gray-700">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Bio
              </label>
              <textarea
                className="w-full px-4 py-3 bg-white/50 border border-purple-200 rounded-lg text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-digis-cyan/50 backdrop-blur-sm resize-none"
                placeholder="Tell us about yourself..."
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-gray-600 mt-1">{bio.length}/200 characters</p>
            </div>

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

            <GlassButton
              type="submit"
              variant="gradient"
              disabled={saving}
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save Profile'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Call Settings - Creators Only */}
        {currentUser?.role === 'creator' && (
          <>
            {/* Video Call Availability Toggle */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl">
                    <Phone className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Available for Video Calls</h3>
                    <p className="text-sm text-gray-600">Allow fans to request video calls with you</p>
                  </div>
                </div>
                <button
                  onClick={() => setCallSettings({ ...callSettings, isAvailableForCalls: !callSettings.isAvailableForCalls })}
                  className="p-2"
                >
                  {callSettings.isAvailableForCalls ? (
                    <ToggleRight className="w-12 h-12 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-gray-400" />
                  )}
                </button>
              </div>
            </GlassCard>

            {/* Video Call Rate Per Minute */}
            <GlassCard className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Video Call Rate</h3>
                  <p className="text-sm text-gray-600 mb-4">Coins per minute for video calls</p>

                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={callSettings.callRatePerMinute}
                      onChange={(e) => setCallSettings({ ...callSettings, callRatePerMinute: parseInt(e.target.value) || 1 })}
                      className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-gray-600">coins/minute</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Video Call Minimum Duration */}
            <GlassCard className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Minimum Video Call Duration</h3>
                  <p className="text-sm text-gray-600 mb-4">Shortest video call length you'll accept</p>

                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={callSettings.minimumCallDuration}
                      onChange={(e) => setCallSettings({ ...callSettings, minimumCallDuration: parseInt(e.target.value) || 1 })}
                      className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-gray-600">minutes</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Voice Call Availability Toggle */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <Mic className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Available for Voice Calls</h3>
                    <p className="text-sm text-gray-600">Allow fans to request voice-only calls with you</p>
                  </div>
                </div>
                <button
                  onClick={() => setCallSettings({ ...callSettings, isAvailableForVoiceCalls: !callSettings.isAvailableForVoiceCalls })}
                  className="p-2"
                >
                  {callSettings.isAvailableForVoiceCalls ? (
                    <ToggleRight className="w-12 h-12 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-gray-400" />
                  )}
                </button>
              </div>
            </GlassCard>

            {/* Voice Call Rate Per Minute */}
            <GlassCard className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Voice Call Rate</h3>
                  <p className="text-sm text-gray-600 mb-4">Coins per minute for voice-only calls</p>

                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={callSettings.voiceCallRatePerMinute}
                      onChange={(e) => setCallSettings({ ...callSettings, voiceCallRatePerMinute: parseInt(e.target.value) || 1 })}
                      className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-gray-600">coins/minute</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Voice Call Minimum Duration */}
            <GlassCard className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-violet-500/20 rounded-xl">
                  <Clock className="w-6 h-6 text-violet-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Minimum Voice Call Duration</h3>
                  <p className="text-sm text-gray-600 mb-4">Shortest voice call length you'll accept</p>

                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={callSettings.minimumVoiceCallDuration}
                      onChange={(e) => setCallSettings({ ...callSettings, minimumVoiceCallDuration: parseInt(e.target.value) || 1 })}
                      className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-gray-600">minutes</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Message Rate */}
            <GlassCard className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-pink-500/20 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-pink-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Cost Per Message</h3>
                  <p className="text-sm text-gray-600 mb-4">Default cost for fans to send you a message (0 = free)</p>

                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={callSettings.messageRate}
                      onChange={(e) => setCallSettings({ ...callSettings, messageRate: parseInt(e.target.value) || 0 })}
                      className="w-32 px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 font-semibold text-center focus:outline-none focus:border-digis-cyan transition-colors"
                    />
                    <span className="text-gray-600">coins/message</span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Info Card */}
            <GlassCard className="p-6 bg-gradient-to-br from-digis-cyan/10 to-purple-500/10 border-digis-cyan/30">
              <div className="flex items-start gap-4">
                <span className="text-3xl">💡</span>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">How Video Calls Work</h4>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li>• Fans request calls from your profile</li>
                    <li>• Coins are held when they request (not charged yet)</li>
                    <li>• You can accept or reject requests</li>
                    <li>• When the call ends, actual cost is calculated and charged</li>
                  </ul>
                </div>
              </div>
            </GlassCard>

            {/* Save Call Settings Button */}
            <GlassCard className="p-6">
              <GlassButton
                variant="gradient"
                onClick={saveCallSettings}
                disabled={savingCallSettings}
                shimmer
                className="w-full"
              >
                {savingCallSettings ? <LoadingSpinner size="sm" /> : 'Save Call Settings'}
              </GlassButton>
            </GlassCard>
          </>
        )}

        {/* Become Creator Section - Only for Fans */}
        {currentUser?.role === 'fan' && (
          <GlassCard className="p-6 border-digis-cyan/20">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-digis-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-800">Become a Creator</h2>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Join our community of creators and start earning from your content, live shows, and more.
            </p>
            <button
              onClick={() => router.push('/creator/apply')}
              className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg font-semibold text-gray-900 hover:scale-105 transition-transform"
            >
              Apply to Become a Creator
            </button>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
