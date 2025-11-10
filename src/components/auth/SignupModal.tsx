'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner, PasswordInput } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Sign up with Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) {
        throw signupError;
      }

      if (!data.user) {
        throw new Error('Signup failed - no user returned');
      }

      // Clear form
      setEmail('');
      setPassword('');

      // Close modal and redirect to username setup
      onClose();
      router.push('/welcome/username');

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex justify-center mb-4">
        <Image
          src="/images/digis-logo-black.png"
          alt="Digis Logo"
          width={150}
          height={50}
          className="h-10 w-auto"
          priority
        />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-gray-700 text-sm mb-1">
          Create your account to connect with creators and fans
        </p>

        <GlassInput
          type="email"
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-700 text-sm">
            {error}
          </div>
        )}

        <GlassButton
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
        </GlassButton>

        <div className="text-center text-gray-700 text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-digis-cyan hover:underline font-semibold"
          >
            Sign in
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
