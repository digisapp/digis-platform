'use client';

import { useState } from 'react';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner } from '@/components/ui';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
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
