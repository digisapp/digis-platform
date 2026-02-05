'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { GlassCard, GlassInput, GlassButton, LoadingSpinner, ResponsiveSettingsLayout, ImageCropper } from '@/components/ui';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { CheckCircle, XCircle, Loader2, User, AtSign, MessageSquare, AlertCircle, Upload, Image as ImageIcon, Mail, Calendar, Shield, Crown, Star, Tag, Share2, Instagram, Youtube, Link2, ExternalLink, Twitch, ShoppingBag, Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Circle, Settings, DollarSign, Video, Phone } from 'lucide-react';
import { validateUsername } from '@/lib/utils/username';
import { uploadImage, validateImageFile, resizeImage } from '@/lib/utils/storage';
import { CREATOR_CATEGORIES } from '@/lib/constants/categories';
import { getNextTierProgress, getTierConfig, type SpendTier } from '@/lib/tiers/spend-tiers';
import { getCreatorNextTierProgress, getCreatorTierConfig, type CreatorTier } from '@/lib/tiers/creator-tiers';
import { ShareDigisCard } from '@/components/share/ShareDigisCard';
import { extractInstagramHandle, extractTiktokHandle, extractTwitterHandle, extractSnapchatHandle, extractYoutubeHandle } from '@/lib/utils/social-handles';

interface UsernameStatus {
  canChange: boolean;
  daysRemaining: number;
  changesUsed: number;
  changesRemaining: number;
  maxChanges: number;
  currentUsername: string;
  lastChangedAt: string | null;
}

interface CreatorLink {
  id: string;
  title: string;
  url: string;
  emoji: string | null;
  isActive: boolean;
  displayOrder: number;
}

// Common emojis for link buttons
const LINK_EMOJI_OPTIONS = ['🛍️', '💄', '👗', '📸', '🎁', '💰', '🔗', '✨', '💅', '👠', '🎵', '📱', '💻', '🎮', '📚', '🪽'];

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  // User data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form fields - track initial values for change detection
  const [initialFormState, setInitialFormState] = useState<any>(null);
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
  const [twitchHandle, setTwitchHandle] = useState('');
  const [amazonHandle, setAmazonHandle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [showSocialLinks, setShowSocialLinks] = useState(true);
  const [showAllSocials, setShowAllSocials] = useState(false);

  // Email change
  const [email, setEmail] = useState('');

  // Image upload states
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [bannerPreview, setBannerPreview] = useState<string | undefined>();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Avatar cropper state
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null);

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

  // Category dropdown states
  const [showPrimaryCategoryDropdown, setShowPrimaryCategoryDropdown] = useState(false);
  const [showSecondaryCategoryDropdown, setShowSecondaryCategoryDropdown] = useState(false);

  // Creator Links state
  const [creatorLinks, setCreatorLinks] = useState<CreatorLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksSaving, setLinksSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<CreatorLink | null>(null);
  const [linkFormData, setLinkFormData] = useState({ title: '', url: '', emoji: '' });

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Track unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialFormState) return false;
    return (
      displayName !== initialFormState.displayName ||
      bio !== initialFormState.bio ||
      city !== initialFormState.city ||
      state !== initialFormState.state ||
      phoneNumber !== initialFormState.phoneNumber ||
      primaryCategory !== initialFormState.primaryCategory ||
      secondaryCategory !== initialFormState.secondaryCategory ||
      email !== initialFormState.email ||
      instagramHandle !== initialFormState.instagramHandle ||
      tiktokHandle !== initialFormState.tiktokHandle ||
      twitterHandle !== initialFormState.twitterHandle ||
      snapchatHandle !== initialFormState.snapchatHandle ||
      youtubeHandle !== initialFormState.youtubeHandle ||
      twitchHandle !== initialFormState.twitchHandle ||
      amazonHandle !== initialFormState.amazonHandle ||
      contactEmail !== initialFormState.contactEmail ||
      showSocialLinks !== initialFormState.showSocialLinks
    );
  }, [
    displayName, bio, city, state, phoneNumber, primaryCategory, secondaryCategory,
    email, instagramHandle, tiktokHandle, twitterHandle, snapchatHandle,
    youtubeHandle, twitchHandle, amazonHandle, contactEmail, showSocialLinks,
    initialFormState
  ]);

  useEffect(() => {
    // Fetch all data in parallel to avoid waterfall
    Promise.all([
      fetchCurrentUser(),
      fetchUsernameCooldown(),
    ]);
  }, []);

  // Fetch creator links when user data is loaded
  useEffect(() => {
    if (currentUser?.role === 'creator') {
      fetchCreatorLinks();
    }
  }, [currentUser?.role]);

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
      setTwitchHandle(data.profile?.twitchHandle || '');
      setAmazonHandle(data.profile?.amazonHandle || '');
      setContactEmail(data.profile?.contactEmail || '');
      setShowSocialLinks(data.profile?.showSocialLinks ?? true);

      // Store initial form state for change detection
      setInitialFormState({
        displayName: data.displayName || '',
        bio: data.bio || '',
        city: data.profile?.city || '',
        state: data.profile?.state || '',
        phoneNumber: data.profile?.phoneNumber || '',
        primaryCategory: data.primaryCategory || '',
        secondaryCategory: data.secondaryCategory || '',
        email: data.email || '',
        instagramHandle: data.profile?.instagramHandle || '',
        tiktokHandle: data.profile?.tiktokHandle || '',
        twitterHandle: data.profile?.twitterHandle || '',
        snapchatHandle: data.profile?.snapchatHandle || '',
        youtubeHandle: data.profile?.youtubeHandle || '',
        twitchHandle: data.profile?.twitchHandle || '',
        amazonHandle: data.profile?.amazonHandle || '',
        contactEmail: data.profile?.contactEmail || '',
        showSocialLinks: data.profile?.showSocialLinks ?? true,
      });
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

  // Creator Links Functions
  const fetchCreatorLinks = async () => {
    setLinksLoading(true);
    try {
      const response = await fetch('/api/creator/links');
      if (response.ok) {
        const data = await response.json();
        setCreatorLinks(data.links || []);
      }
    } catch (err) {
      console.error('Error fetching creator links:', err);
    } finally {
      setLinksLoading(false);
    }
  };

  const handleOpenLinkModal = (link?: CreatorLink) => {
    if (link) {
      setEditingLink(link);
      setLinkFormData({
        title: link.title,
        url: link.url,
        emoji: link.emoji || '',
      });
    } else {
      setEditingLink(null);
      setLinkFormData({ title: '', url: '', emoji: '' });
    }
    setShowLinkModal(true);
  };

  const handleCloseLinkModal = () => {
    setShowLinkModal(false);
    setEditingLink(null);
    setLinkFormData({ title: '', url: '', emoji: '' });
  };

  const handleSaveLink = async () => {
    if (!linkFormData.title.trim() || !linkFormData.url.trim()) {
      setError('Title and URL are required');
      return;
    }

    // Validate URL
    try {
      new URL(linkFormData.url);
    } catch {
      setError('Please enter a valid URL (include https://)');
      return;
    }

    setLinksSaving(true);
    try {
      const url = editingLink
        ? `/api/creator/links/${editingLink.id}`
        : '/api/creator/links';
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: linkFormData.title.trim(),
          url: linkFormData.url.trim(),
          emoji: linkFormData.emoji || null,
        }),
      });

      if (response.ok) {
        setMessage(editingLink ? 'Link updated!' : 'Link added!');
        setTimeout(() => setMessage(''), 3000);
        handleCloseLinkModal();
        fetchCreatorLinks();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save link');
      }
    } catch (err) {
      setError('Failed to save link');
    } finally {
      setLinksSaving(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const response = await fetch(`/api/creator/links/${linkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Link deleted');
        setTimeout(() => setMessage(''), 3000);
        setCreatorLinks(creatorLinks.filter(l => l.id !== linkId));
      } else {
        setError('Failed to delete link');
      }
    } catch (err) {
      setError('Failed to delete link');
    }
  };

  const handleToggleLinkActive = async (link: CreatorLink) => {
    try {
      const response = await fetch(`/api/creator/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      });

      if (response.ok) {
        setCreatorLinks(creatorLinks.map(l =>
          l.id === link.id ? { ...l, isActive: !l.isActive } : l
        ));
      }
    } catch (err) {
      setError('Failed to update link');
    }
  };

  // Link Move with Up/Down Arrows
  const moveLink = async (index: number, direction: 'up' | 'down') => {
    const newLinks = [...creatorLinks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newLinks.length) return;

    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
    setCreatorLinks(newLinks);

    // Save new order
    try {
      await fetch('/api/creator/links/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: newLinks.map(l => l.id) }),
      });
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmUsername: currentUser?.username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out and redirect to home with hard navigation
      await signOut();
      window.location.href = '/?deleted=true';
    } catch (err: any) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  };

  // Check username availability with debouncing - improved version
  useEffect(() => {
    // Reset to idle if username is empty or too short
    if (!newUsername || newUsername.length < 3) {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    // Check if it's the same as current username
    if (newUsername.toLowerCase() === currentUser?.username?.toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameError('');
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
    }, 600); // Slightly longer debounce

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

      // Update initial form state after successful save
      setInitialFormState({
        displayName,
        bio,
        city,
        state,
        phoneNumber,
        primaryCategory,
        secondaryCategory,
        email,
        instagramHandle,
        tiktokHandle,
        twitterHandle,
        snapchatHandle,
        youtubeHandle,
        twitchHandle,
        amazonHandle,
        contactEmail,
        showSocialLinks,
      });

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

    // Read file and show cropper
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarToCrop(reader.result as string);
      setShowAvatarCropper(true);
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const handleAvatarCropComplete = async (croppedBlob: Blob) => {
    if (!currentUser) return;

    setShowAvatarCropper(false);
    setAvatarToCrop(null);
    setUploadingAvatar(true);
    setError('');

    try {
      // Convert blob to file
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });

      // Upload to Supabase Storage
      const url = await uploadImage(croppedFile, 'avatar', currentUser.id);

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

  const handleAvatarCropCancel = () => {
    setShowAvatarCropper(false);
    setAvatarToCrop(null);
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

  // ============ SECTION RENDERERS ============

  // Profile Section (Profile Media + Profile Information)
  const renderProfileSection = () => (
    <div className="space-y-6">
      {/* Profile Media */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-digis-cyan" />
          Profile Media
        </h3>
        <div className="space-y-4">
          {/* Banner Preview - Clickable - Creators Only */}
          {currentUser?.role === 'creator' && (
            <label className="relative aspect-[3/1] md:aspect-[4/1] rounded-lg overflow-hidden bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 cursor-pointer group block">
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
      </div>

      {/* Profile Information */}
      <div className="pt-6 border-t border-cyan-500/20">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-digis-pink" />
          <h3 className="text-lg font-semibold text-white">Profile Information</h3>
        </div>

        <div className="space-y-4">
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
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{bio.length}/500 characters</p>
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

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              Contact Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <p className="text-xs text-gray-400 mt-1">Contact email shown on your public profile</p>
          </div>
        </div>
      </div>

      {/* Account Details Section */}
      <div className="pt-6 border-t border-cyan-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-digis-purple" />
          <h3 className="text-lg font-semibold text-white">Account</h3>
        </div>

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
                  !newUsername || newUsername === currentUser?.username || newUsername.length < 3
                    ? 'border-white/10 focus:border-digis-cyan'
                    : usernameStatus === 'checking'
                    ? 'border-yellow-400'
                    : usernameStatus === 'available'
                    ? 'border-green-500'
                    : usernameStatus === 'taken'
                    ? 'border-red-500'
                    : 'border-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {newUsername && newUsername !== currentUser?.username && newUsername.length >= 3 && (
                <div className="absolute right-2 top-2">
                  {usernameStatus === 'checking' && (
                    <div className="flex items-center gap-1">
                      <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                      <span className="text-xs text-yellow-500">Checking...</span>
                    </div>
                  )}
                  {usernameStatus === 'available' && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-500">Available</span>
                    </div>
                  )}
                  {usernameStatus === 'taken' && (
                    <div className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-500">Taken</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {usernameError && newUsername.length >= 3 && (
              <p className="text-xs text-red-400 mt-1">{usernameError}</p>
            )}
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

          {/* Login Email - Editable */}
          <div className="p-3 backdrop-blur-xl bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-digis-cyan" />
              <p className="text-xs text-gray-400">Login Email</p>
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
      </div>
    </div>
  );

  // Social Section (Social Media + My Links for creators)
  const renderSocialSection = () => {
    if (currentUser?.role !== 'creator') {
      return (
        <div className="text-center py-8 text-gray-400">
          <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Social media settings are only available for creators.</p>
          <button
            onClick={() => router.push('/creator/apply')}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-lg text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Become a Creator
          </button>
        </div>
      );
    }

    const primaryPlatforms = [
      { key: 'instagram', icon: Instagram, color: 'pink-500', value: instagramHandle, setter: setInstagramHandle, placeholder: 'username', extract: extractInstagramHandle },
      { key: 'tiktok', icon: null, svgPath: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z', color: 'cyan-500', value: tiktokHandle, setter: setTiktokHandle, placeholder: 'username', extract: extractTiktokHandle },
      { key: 'youtube', icon: Youtube, color: 'red-500', value: youtubeHandle, setter: setYoutubeHandle, placeholder: 'channel', extract: extractYoutubeHandle },
    ];

    const secondaryPlatforms = [
      { key: 'twitter', icon: null, svgPath: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', color: 'gray-500', value: twitterHandle, setter: setTwitterHandle, placeholder: 'username', extract: extractTwitterHandle, label: 'X (Twitter)' },
      { key: 'snapchat', icon: null, svgPath: 'M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.809-.329-1.224-.72-1.227-1.153-.015-.36.27-.69.72-.854.149-.06.314-.09.494-.09.12 0 .284.015.435.09.375.18.72.3 1.034.3.21 0 .314-.044.389-.074-.007-.18-.022-.345-.029-.525l-.006-.061c-.105-1.627-.225-3.654.3-4.848C7.849 1.069 11.205.793 12.191.793h.03z', color: 'yellow-400', value: snapchatHandle, setter: setSnapchatHandle, placeholder: 'username', extract: extractSnapchatHandle },
      { key: 'twitch', icon: Twitch, color: 'purple-500', value: twitchHandle, setter: setTwitchHandle, placeholder: 'username', extract: (v: string) => v.replace(/^@/, '') },
      { key: 'amazon', icon: ShoppingBag, color: 'orange-500', value: amazonHandle, setter: setAmazonHandle, placeholder: 'https://amazon.com/hz/wishlist/...', isUrl: true, label: 'Amazon Wishlist' },
    ];

    const renderSocialInput = (platform: typeof primaryPlatforms[0] | typeof secondaryPlatforms[0]) => {
      const Icon = platform.icon;
      const isUrl = 'isUrl' in platform && platform.isUrl;
      const isEmail = 'isEmail' in platform && platform.isEmail;

      return (
        <div key={platform.key} className="relative">
          <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
            {Icon ? (
              <Icon className={`w-4 h-4 text-${platform.color}`} />
            ) : platform.svgPath ? (
              <svg className={`w-4 h-4 text-${platform.color}`} viewBox="0 0 24 24" fill="currentColor">
                <path d={platform.svgPath} />
              </svg>
            ) : null}
            {'label' in platform ? platform.label : platform.key.charAt(0).toUpperCase() + platform.key.slice(1)}
          </label>
          <div className="relative">
            {!isUrl && !isEmail && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
            )}
            <input
              type={isEmail ? 'email' : isUrl ? 'url' : 'text'}
              placeholder={platform.placeholder}
              value={platform.value}
              onChange={(e) => {
                const extract = 'extract' in platform ? platform.extract : undefined;
                platform.setter(extract ? extract(e.target.value) : e.target.value);
              }}
              className={`w-full ${!isUrl && !isEmail ? 'pl-8' : 'pl-4'} pr-4 py-3 backdrop-blur-xl bg-white/5 border border-cyan-500/30 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-${platform.color}/50`}
            />
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Social Media Section */}
        <div>
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

          {/* Primary Platforms (always visible) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryPlatforms.map(renderSocialInput)}
          </div>

          {/* Show More Button */}
          <button
            type="button"
            onClick={() => setShowAllSocials(!showAllSocials)}
            className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-cyan-500/30 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {showAllSocials ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show fewer platforms
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show more platforms
              </>
            )}
          </button>

          {/* Secondary Platforms (collapsible) */}
          {showAllSocials && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {secondaryPlatforms.map(renderSocialInput)}
            </div>
          )}
        </div>

        {/* My Links Section */}
        <div className="pt-6 border-t border-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-cyan-400" />
              My Links
            </h3>
            {creatorLinks.length > 0 && (
              <span className="text-sm text-gray-400">{creatorLinks.length}/8 links</span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Add affiliate deals, discount codes, wishlists, and promo links to your profile.
          </p>

          {/* Add Link Button */}
          {creatorLinks.length < 8 && (
            <button
              type="button"
              onClick={() => handleOpenLinkModal()}
              className="w-full mb-4 p-3 border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-xl text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Link</span>
            </button>
          )}

          {/* Links List */}
          {linksLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : creatorLinks.length === 0 ? (
            <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
              <Link2 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No links yet</p>
              <p className="text-gray-500 text-xs mt-1">Add your first link above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {creatorLinks.map((link, index) => (
                <div
                  key={link.id}
                  className={`group p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all ${
                    !link.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Order Number */}
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                      {index + 1}
                    </div>

                    {/* Up/Down Arrows */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveLink(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLink(index, 'down')}
                        disabled={index === creatorLinks.length - 1}
                        className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Emoji */}
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                      {link.emoji || '🔗'}
                    </div>

                    {/* Title & URL */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm truncate">{link.title}</h4>
                      <p className="text-xs text-gray-400 truncate">{link.url}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleLinkActive(link)}
                        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                          link.isActive ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${
                          link.isActive ? 'translate-x-4' : ''
                        }`} />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleOpenLinkModal(link)}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Preview Link */}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Rates Section - Only for Creators
  const renderRatesSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Rates
        </h3>
        <p className="text-sm text-gray-400 mb-3">
          Set your rates for video calls, voice calls, and messages. Toggle call availability on or off.
        </p>
        <button
          type="button"
          onClick={() => router.push('/creator/pricing')}
          className="w-full px-6 py-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 rounded-xl font-semibold text-white hover:scale-[1.01] transition-all flex items-center justify-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-green-400" />
            <Phone className="w-5 h-5 text-green-400" />
          </div>
          <span>Manage Rates & Call Settings</span>
        </button>
      </div>
    </div>
  );

  // Actions Section (Delete Account, Become Creator)
  const renderActionsSection = () => (
    <div className="space-y-6">
      {/* Become Creator Button - Only for Fans */}
      {currentUser?.role === 'fan' && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Crown className="w-5 h-5 text-digis-pink" />
            Creator Account
          </h3>
          <p className="text-sm text-gray-400 mb-3">
            Upgrade to a creator account to start streaming, receive tips, and build your community.
          </p>
          <button
            type="button"
            onClick={() => router.push('/creator/apply')}
            className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink rounded-xl font-semibold text-white hover:scale-[1.02] transition-transform"
          >
            Become a Creator
          </button>
        </div>
      )}

      {/* Delete Account */}
      <div className="pt-6 border-t border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Delete Account
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => {
            setShowDeleteModal(true);
            setDeleteConfirmText('');
            setDeleteError('');
          }}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium transition-all"
        >
          Delete My Account
        </button>
      </div>

      {/* Support */}
      <div className="pt-6 border-t border-cyan-500/20 text-center">
        <span className="text-gray-400">Contact Support: </span>
        <a
          href="mailto:support@digis.cc?subject=Digis Support Request"
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          support@digis.cc
        </a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Define sections for the responsive layout
  const sections = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      content: renderProfileSection(),
    },
    // Rates tab - only for creators
    ...(currentUser?.role === 'creator' ? [{
      id: 'rates',
      label: 'Rates',
      icon: DollarSign,
      content: renderRatesSection(),
    }] : []),
    {
      id: 'social',
      label: 'Social',
      icon: Share2,
      content: renderSocialSection(),
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: Settings,
      content: renderActionsSection(),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 pt-4 md:py-12 px-4 pb-24 md:pb-8 relative overflow-hidden">
      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {/* Animated background effects - hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Page Header with Save State Indicator */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="text-yellow-400 text-sm flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Circle className="w-2 h-2 fill-current" />
                Unsaved changes
              </span>
            ) : lastSaved ? (
              <span className="text-green-400 text-sm flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-3 h-3" />
                Saved
              </span>
            ) : null}
          </div>
        </div>

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

        {/* Responsive Settings Layout */}
        <form onSubmit={handleSaveProfile}>
          <ResponsiveSettingsLayout sections={sections} defaultSection="profile" />

          {/* Save Button - Shown outside the tabs/accordion */}
          <div className="mt-6">
            <GlassButton
              type="submit"
              variant="gradient"
              disabled={saving}
              className="w-full md:w-auto"
            >
              {saving ? <LoadingSpinner size="sm" /> : 'Save Profile'}
            </GlassButton>
          </div>
        </form>

        {/* Share Your Digis Section - Creators Only */}
        {currentUser?.role === 'creator' && (
          <div className="mt-6 p-6 backdrop-blur-xl bg-white/5 border border-cyan-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-5 h-5 text-digis-cyan" />
              <h3 className="text-lg font-semibold text-white">Share Your Digis</h3>
            </div>
            <ShareDigisCard
              username={currentUser.username || ''}
              displayName={currentUser.displayName || undefined}
              profileImage={currentUser.avatarUrl}
              bio={currentUser.bio}
            />
          </div>
        )}
      </div>

      {/* Add/Edit Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCloseLinkModal}
          />

          <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-white/10 rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">
                {editingLink ? 'Edit Link' : 'Add New Link'}
              </h2>
              <button
                onClick={handleCloseLinkModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Icon (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {LINK_EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setLinkFormData({ ...linkFormData, emoji })}
                      className={`w-10 h-10 rounded-lg text-xl transition-all ${
                        linkFormData.emoji === emoji
                          ? 'bg-cyan-500/30 border-2 border-cyan-500'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  {linkFormData.emoji && !LINK_EMOJI_OPTIONS.includes(linkFormData.emoji) && (
                    <button
                      type="button"
                      className="w-10 h-10 rounded-lg text-xl bg-cyan-500/30 border-2 border-cyan-500"
                    >
                      {linkFormData.emoji}
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={linkFormData.title}
                  onChange={(e) => setLinkFormData({ ...linkFormData, title: e.target.value })}
                  placeholder="e.g., Shop My Favorites"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={linkFormData.url}
                  onChange={(e) => setLinkFormData({ ...linkFormData, url: e.target.value })}
                  placeholder="https://example.com/my-link"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={handleCloseLinkModal}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
              <GlassButton
                onClick={handleSaveLink}
                disabled={linksSaving || !linkFormData.title.trim() || !linkFormData.url.trim()}
                variant="gradient"
                className="flex-1"
              >
                {linksSaving ? <LoadingSpinner size="sm" /> : (editingLink ? 'Save Changes' : 'Add Link')}
              </GlassButton>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />

          <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-red-500/30 rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-red-500/20">
              <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Delete Account
              </h2>
              <button
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300 font-medium mb-2">This action is permanent and cannot be undone.</p>
                <p className="text-xs text-gray-400">
                  All your data will be permanently deleted, including:
                </p>
                <ul className="text-xs text-gray-400 mt-2 space-y-1 list-disc list-inside">
                  <li>Profile information and settings</li>
                  <li>Messages and conversations</li>
                  <li>Content, streams, and VODs</li>
                  <li>Wallet balance and transaction history</li>
                  <li>Subscriptions and followers</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  disabled={deleting}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 disabled:opacity-50 font-mono"
                />
              </div>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{deleteError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/30 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Cropper Modal */}
      {showAvatarCropper && avatarToCrop && (
        <ImageCropper
          image={avatarToCrop}
          onCropComplete={handleAvatarCropComplete}
          onCancel={handleAvatarCropCancel}
          cropShape="round"
          aspectRatio={1}
          title="Adjust Profile Photo"
        />
      )}
    </div>
  );
}
