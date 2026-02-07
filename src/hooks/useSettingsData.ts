'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateUsername } from '@/lib/utils/username';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import type { SettingsFormState } from '@/hooks/useSettingsForm';
import type { UsernameStatus } from '@/components/settings/types';

interface UseSettingsDataParams {
  form: SettingsFormState;
  setField: <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => void;
  populateFromApi: (data: any) => void;
  markAsSaved: () => void;
}

export function useSettingsData({ form, setField, populateFromApi, markAsSaved }: UseSettingsDataParams) {
  const router = useRouter();

  // User data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Image upload states
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [bannerPreview, setBannerPreview] = useState<string | undefined>();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Avatar cropper state
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null);

  // Destructure for use in handlers
  const { displayName, bio, city, state, phoneNumber, avatarUrl, bannerUrl,
    primaryCategory, secondaryCategory, email, instagramHandle, tiktokHandle,
    twitterHandle, snapchatHandle, youtubeHandle, twitchHandle, amazonHandle,
    contactEmail, showSocialLinks } = form;

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        console.error('Error loading user data:', data.error);
        setError(data.error || 'Failed to load user data');
        setLoading(false);
        return;
      }

      setCurrentUser(data);
      populateFromApi(data);
      setNewUsername(data.username || '');
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, populateFromApi]);

  const fetchUsernameCooldown = useCallback(async () => {
    try {
      const response = await fetch('/api/user/update-username');
      const data = await response.json();

      if (response.ok) {
        setUsernameCooldown(data);
      }
    } catch (err) {
      console.error('Error fetching username cooldown:', err);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    Promise.all([
      fetchCurrentUser(),
      fetchUsernameCooldown(),
    ]);
  }, [fetchCurrentUser, fetchUsernameCooldown]);

  // Username availability check with debouncing
  useEffect(() => {
    if (!newUsername || newUsername.length < 3) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    if (newUsername.toLowerCase() === currentUser?.username?.toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

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
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [newUsername, currentUser]);

  const handleEmailChange = useCallback(async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    const response = await fetch('/api/user/update-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail: email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update email');
    }
  }, [email]);

  const handleSaveProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      const emailChanged = email !== currentUser?.email;

      if (emailChanged) {
        await handleEmailChange();
      }

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
          instagramHandle: instagramHandle || null,
          tiktokHandle: tiktokHandle || null,
          twitterHandle: twitterHandle || null,
          snapchatHandle: snapchatHandle || null,
          youtubeHandle: youtubeHandle || null,
          twitchHandle: twitchHandle || null,
          amazonHandle: amazonHandle || null,
          contactEmail: contactEmail || null,
          showSocialLinks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      markAsSaved();
      setLastSaved(new Date());

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
  }, [currentUser, email, displayName, bio, city, state, phoneNumber, avatarUrl, bannerUrl,
    primaryCategory, secondaryCategory, instagramHandle, tiktokHandle, twitterHandle,
    snapchatHandle, youtubeHandle, twitchHandle, amazonHandle, contactEmail, showSocialLinks,
    handleEmailChange, markAsSaved]);

  const handleChangeUsername = useCallback(async (e: React.FormEvent) => {
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

      await fetchUsernameCooldown();
      await fetchCurrentUser();

      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingUsername(false);
    }
  }, [usernameStatus, newUsername, fetchUsernameCooldown, fetchCurrentUser]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const validation = validateImageFile(file, 'avatar');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarToCrop(reader.result as string);
      setShowAvatarCropper(true);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  }, [currentUser]);

  const handleAvatarCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!currentUser) return;

    setShowAvatarCropper(false);
    setAvatarToCrop(null);
    setUploadingAvatar(true);
    setError('');

    try {
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const url = await uploadImage(croppedFile, 'avatar', currentUser.id);

      setAvatarPreview(url);

      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save avatar');
      }

      setField('avatarUrl', url);
      setMessage('Avatar updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }, [currentUser, setField]);

  const handleAvatarCropCancel = useCallback(() => {
    setShowAvatarCropper(false);
    setAvatarToCrop(null);
  }, []);

  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const validation = validateImageFile(file, 'banner');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploadingBanner(true);
    setError('');

    try {
      const resizedFile = await resizeImage(file, 1920, 500);
      const url = await uploadImage(resizedFile, 'banner', currentUser.id);

      setBannerPreview(url);

      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerUrl: url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save banner');
      }

      setField('bannerUrl', url);
      setMessage('Banner updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Banner upload error:', err);
      setError(err.message || 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  }, [currentUser, setField]);

  return {
    currentUser,
    loading,
    newUsername,
    setNewUsername,
    usernameStatus,
    usernameError,
    usernameCooldown,
    saving,
    savingUsername,
    message,
    setMessage,
    error,
    setError,
    lastSaved,
    avatarPreview,
    bannerPreview,
    uploadingAvatar,
    uploadingBanner,
    showAvatarCropper,
    avatarToCrop,
    handleSaveProfile,
    handleChangeUsername,
    handleAvatarUpload,
    handleAvatarCropComplete,
    handleAvatarCropCancel,
    handleBannerUpload,
  };
}
