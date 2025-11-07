'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';
import { validateUsername, suggestUsername } from '@/lib/utils/username';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [usernameError, setUsernameError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-suggest username from email
  useEffect(() => {
    if (email && !username) {
      const suggested = suggestUsername(email.split('@')[0]);
      setUsername(suggested);
    }
  }, [email, username]);

  // Check username availability with debouncing
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameError('');
      setUsernameSuggestions([]);
      return;
    }

    // Validate format first
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameStatus('idle');
      setUsernameError(validation.error || '');
      setUsernameSuggestions([]);
      return;
    }

    setUsernameError('');
    setUsernameStatus('checking');

    const timeoutId = setTimeout(async () => {
      try {
        console.log('[Frontend] Checking username:', username);
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        console.log('[Frontend] Response status:', response.status);

        const data = await response.json();
        console.log('[Frontend] Response data:', data);

        if (data.available) {
          console.log('[Frontend] Username available!');
          setUsernameStatus('available');
          setUsernameSuggestions([]);
        } else {
          console.log('[Frontend] Username taken, suggestions:', data.suggestions);
          setUsernameStatus('taken');
          setUsernameSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error('[Frontend] Error checking username:', err);
        setUsernameStatus('idle');
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate username is available
    if (usernameStatus !== 'available') {
      setError('Please choose an available username');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, username: username.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSuccess(data.message);
      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
      setUsername('');

      // Switch to login after 2 seconds
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Join Digis" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <GlassInput
          type="text"
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <GlassInput
          type="email"
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Username Field with Real-time Checker */}
        <div className="space-y-2">
          <div className="relative">
            <GlassInput
              type="text"
              label="Username"
              placeholder="yourhandle"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
            />
            {/* Status Indicator */}
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
          </div>

          {/* Username Error */}
          {usernameError && (
            <p className="text-sm text-red-400">{usernameError}</p>
          )}

          {/* Availability Message */}
          {usernameStatus === 'available' && (
            <p className="text-sm text-green-400">@{username} is available!</p>
          )}
          {usernameStatus === 'taken' && (
            <p className="text-sm text-red-400">@{username} is already taken</p>
          )}

          {/* Suggestions */}
          {usernameSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Try these instead:</p>
              <div className="flex flex-wrap gap-2">
                {usernameSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setUsername(suggestion)}
                    className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white transition-colors"
                  >
                    @{suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <GlassInput
          type="password"
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-500/20 border border-green-500 text-green-300 text-sm">
            {success}
          </div>
        )}

        <GlassButton
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Create Account'}
        </GlassButton>

        <div className="text-center text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-digis-cyan hover:underline"
          >
            Sign in
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
