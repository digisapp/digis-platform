'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Loader2, Camera, User, AtSign } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface CreatorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CreatorOnboardingModal({ isOpen, onClose, onComplete }: CreatorOnboardingModalProps) {
  const { showSuccess, showError } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = username, 2 = profile details

  // Check username availability with debouncing
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameError(username.length > 0 && username.length < 3 ? 'Username must be at least 3 characters' : '');
      return;
    }

    // Basic validation
    if (!/^[a-z][a-z0-9_]*$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameError('Must start with a letter, only letters, numbers, and underscores');
      return;
    }

    if (username.length > 20) {
      setUsernameStatus('invalid');
      setUsernameError('Username must be 20 characters or less');
      return;
    }

    setUsernameStatus('checking');
    setUsernameError('');

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/user/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.toLowerCase() }),
        });
        const data = await response.json();

        if (response.ok && data.data?.available) {
          setUsernameStatus('available');
          setUsernameError('');
        } else if (data.source === 'reserved') {
          setUsernameStatus('taken');
          setUsernameError(data.error || 'This username is reserved');
        } else {
          setUsernameStatus('taken');
          setUsernameError(data.error || 'Username is not available');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
        setUsernameError('Could not check availability');
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be under 5MB');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleNextStep = () => {
    if (usernameStatus !== 'available') {
      setError('Please choose an available username');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Step 1: Set username
      const usernameResponse = await fetch('/api/user/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase(),
          displayName: displayName || username,
        }),
      });

      if (!usernameResponse.ok) {
        const data = await usernameResponse.json();
        throw new Error(data.error || 'Failed to set username');
      }

      // Step 2: Upload avatar if provided
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const avatarResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!avatarResponse.ok) {
          console.warn('Avatar upload failed, continuing anyway');
        }
      }

      // Step 3: Update bio if provided
      if (bio.trim()) {
        const bioResponse = await fetch('/api/user/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bio.trim() }),
        });

        if (!bioResponse.ok) {
          console.warn('Bio update failed, continuing anyway');
        }
      }

      // Note: Onboarding is considered complete once username is set (no longer starts with 'user_')
      showSuccess('Welcome to Digis! Your creator profile is set up.');
      onComplete();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div className="flex justify-center mb-6">
        <Image
          src="/images/digis-logo-white.png"
          alt="Digis Logo"
          width={150}
          height={50}
          className="h-10 w-auto"
          priority
        />
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome, Creator! 🎉
        </h2>
        <p className="text-gray-400">
          {step === 1
            ? "Let's set up your profile. First, choose your unique username."
            : "Great! Now add a profile picture and bio to help fans find you."}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-digis-cyan' : 'bg-white/20'}`} />
        <div className={`w-8 h-0.5 transition-colors ${step >= 2 ? 'bg-digis-cyan' : 'bg-white/20'}`} />
        <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-digis-purple' : 'bg-white/20'}`} />
      </div>

      {step === 1 ? (
        /* Step 1: Username */
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Username <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-500">
              This will be your profile URL: digis.cc/{username || 'username'}
            </p>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <AtSign className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourname"
                className={`w-full pl-10 pr-10 py-3 bg-white/5 border-2 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all ${
                  usernameStatus === 'idle' || !username
                    ? 'border-white/10 focus:border-digis-cyan'
                    : usernameStatus === 'checking'
                    ? 'border-yellow-500'
                    : usernameStatus === 'available'
                    ? 'border-green-500'
                    : 'border-red-500'
                }`}
                maxLength={20}
                autoFocus
              />
              {/* Status Indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                )}
                {usernameStatus === 'available' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
            {usernameError && (
              <p className="text-xs text-red-400">{usernameError}</p>
            )}
            {usernameStatus === 'available' && (
              <p className="text-xs text-green-400">✓ digis.cc/{username} is available!</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Display Name <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={username || 'Your Name'}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
              maxLength={50}
            />
            <p className="text-xs text-gray-500">How you want your name displayed to fans</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleNextStep}
            disabled={usernameStatus !== 'available'}
            className="w-full px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            Continue →
          </button>
        </div>
      ) : (
        /* Step 2: Profile Picture & Bio */
        <div className="space-y-4">
          {/* Avatar Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Profile Picture <span className="text-gray-500">(optional)</span>
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 hover:border-digis-cyan transition-colors cursor-pointer flex items-center justify-center overflow-hidden"
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG. Max 5MB.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Bio <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell fans a bit about yourself..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">{bio.length}/500</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-semibold transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Setting up...</span>
                </div>
              ) : "Let's Go! 🚀"}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip for now
          </button>
        </div>
      )}
    </GlassModal>
  );
}
