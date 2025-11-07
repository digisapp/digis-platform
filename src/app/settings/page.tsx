'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Loader2, User, AtSign, MessageSquare, AlertCircle } from 'lucide-react';
import { validateUsername } from '@/lib/utils/username';

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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

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

  useEffect(() => {
    fetchCurrentUser();
    fetchUsernameCooldown();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load user data');
      }

      setCurrentUser(data);
      setDisplayName(data.displayName || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatarUrl || '');
      setBannerUrl(data.bannerUrl || '');
    } catch (err: any) {
      setError(err.message);
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
          avatarUrl,
          bannerUrl,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-digis-dark flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-digis-dark py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-gray-400 mt-2">Manage your profile and preferences</p>
        </div>

        {/* Global Messages */}
        {message && (
          <div className="p-4 rounded-lg bg-green-500/20 border border-green-500 text-green-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500 text-red-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Username Change Section */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AtSign className="w-5 h-5 text-digis-cyan" />
            <h2 className="text-xl font-semibold">Change Username</h2>
          </div>

          <div className="mb-4 p-4 bg-digis-dark/50 rounded-lg">
            <p className="text-sm text-gray-400">
              Current username: <span className="text-white font-semibold">@{currentUser?.username}</span>
            </p>
            {usernameCooldown && !usernameCooldown.canChange && (
              <p className="text-sm text-yellow-400 mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                You can change your username again in {usernameCooldown.daysRemaining} day{usernameCooldown.daysRemaining !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <form onSubmit={handleChangeUsername} className="space-y-4">
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
              <p className="text-sm text-red-400">{usernameError}</p>
            )}
            {usernameStatus === 'available' && (
              <p className="text-sm text-green-400">@{newUsername} is available!</p>
            )}

            <p className="text-xs text-gray-500">
              You can change your username once every 30 days. Choose wisely!
            </p>

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
            <h2 className="text-xl font-semibold">Profile Information</h2>
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
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-digis-cyan/50 backdrop-blur-sm resize-none"
                placeholder="Tell us about yourself..."
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{bio.length}/200 characters</p>
            </div>

            <GlassInput
              type="url"
              label="Avatar URL"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />

            <GlassInput
              type="url"
              label="Banner URL"
              placeholder="https://example.com/banner.jpg"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
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

        {/* Sign Out Section */}
        <GlassCard className="p-6 border-red-500/20">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
          <p className="text-sm text-gray-400 mb-4">
            Sign out of your account. You'll need to log in again to access your account.
          </p>
          <GlassButton
            onClick={async () => {
              const { createClient } = await import('@/lib/supabase/client');
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push('/');
            }}
            variant="ghost"
            className="bg-red-500/10 hover:bg-red-500/20 border-red-500 text-red-400"
          >
            Sign Out
          </GlassButton>
        </GlassCard>

        {/* Back to Profile */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/profile/${currentUser?.username}`)}
            className="text-digis-cyan hover:underline"
          >
            View Your Profile
          </button>
        </div>
      </div>
    </div>
  );
}
