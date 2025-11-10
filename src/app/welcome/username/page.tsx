'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassButton, GlassInput, LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function UsernameSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'error'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    // Check if user already has a username
    const response = await fetch('/api/user/profile');
    const data = await response.json();

    if (data.user?.username) {
      // User already has a username, redirect to dashboard
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  };

  // Check username availability with debouncing
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameError('');
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
          setUsernameStatus('reserved');
          setUsernameError(data.error || 'This username is reserved for verified creators');
        } else if (data.source === 'taken') {
          setUsernameStatus('taken');
          setUsernameError(data.error || 'Username already taken');
        } else {
          setUsernameStatus('idle');
          setUsernameError(data.error || 'Invalid username');
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('error');
        setUsernameError('Could not check username availability');
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (usernameStatus === 'taken' || usernameStatus === 'reserved') {
      setError('Please choose a different username');
      return;
    }

    if (usernameStatus === 'checking') {
      setError('Still checking username availability. Please wait a moment.');
      return;
    }

    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/user/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase(),
          displayName: displayName || username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set username');
      }

      // Success! Redirect to dashboard
      router.push('/dashboard');

    } catch (err: any) {
      console.error('Error setting username:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to Digis! 👋
          </h1>
          <p className="text-gray-400">
            Choose your username to complete your profile
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-8 space-y-6">
          {/* Username Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Username <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Your unique handle on Digis (digis.cc/{username || 'username'})
            </p>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourhandle"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors pr-10"
                required
                minLength={3}
                maxLength={20}
              />
              {/* Status Indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                )}
                {usernameStatus === 'available' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'reserved') && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                {usernameStatus === 'error' && (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </div>

            {/* Status Messages */}
            {usernameError && (
              <p className="text-sm text-red-400">{usernameError}</p>
            )}
            {usernameStatus === 'available' && username && (
              <p className="text-sm text-green-400">✓ @{username} is available!</p>
            )}

            {/* Username Rules */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>• 3-20 characters</p>
              <p>• Letters, numbers, and underscores only</p>
              <p>• Must start with a letter</p>
            </div>
          </div>

          {/* Display Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Display Name <span className="text-gray-500">(optional)</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              How you want to be shown (defaults to your username)
            </p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={username || 'Your Name'}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
              maxLength={50}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <GlassButton
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={submitting || usernameStatus !== 'available'}
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Complete Setup'}
          </GlassButton>

          <p className="text-xs text-gray-500 text-center">
            You can't change your username later, so choose wisely!
          </p>
        </form>
      </div>
    </div>
  );
}
